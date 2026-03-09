package storage

import (
	"fmt"
	"sort"
	"strings"
)

// columnWhitelist is the set of allowed column names per table.
// This prevents SQL injection through column names.
var columnWhitelist = map[string]map[string]bool{
	"customer": {
		"id": true, "email": true, "display_name": true, "phone": true,
		"locale": true, "tier": true, "status": true,
		"birth_date": true, "birth_time": true, "birth_city": true,
		"birth_lat": true, "birth_lng": true, "zodiac_sign": true,
		"chinese_zodiac": true, "five_element": true,
		"occupation": true, "industry": true,
		"created_at": true, "updated_at": true,
	},
	"customer_contact": {
		"id": true, "customer_id": true, "nickname": true,
		"relationship": true, "birth_date": true, "birth_time": true,
		"birth_city": true, "notes": true, "created_at": true,
	},
	"customer_birth_chart": {
		"id": true, "customer_id": true, "owner_type": true,
		"contact_id": true, "chart_type": true, "partner_id": true,
		"document_ref": true, "created_at": true,
	},
	"customer_address": {
		"id": true, "customer_id": true, "label": true,
		"recipient": true, "phone": true, "address_line1": true,
		"address_line2": true, "city": true, "district": true,
		"postal_code": true, "country": true, "is_default": true,
		"created_at": true,
	},
	"tag": {
		"id": true, "name": true, "category": true,
		"color": true, "created_at": true,
	},
	"customer_tag": {
		"id": true, "customer_id": true, "tag_id": true,
		"created_at": true,
	},
	"finance_record": {
		"id": true, "customer_id": true, "type": true,
		"amount": true, "currency": true, "reference_id": true,
		"description": true, "status": true, "created_at": true,
	},
	"customer_consent": {
		"id": true, "customer_id": true, "consent_type": true,
		"granted": true, "granted_at": true, "revoked_at": true,
		"ip_address": true,
	},
	"customer_note": {
		"id": true, "customer_id": true, "author_id": true,
		"content": true, "category": true, "created_at": true,
	},
	// Caring
	"caring_plan": {
		"id": true, "customer_id": true, "type": true,
		"frequency": true, "channel": true, "status": true,
		"next_trigger_at": true, "created_at": true,
	},
	"caring_action": {
		"id": true, "plan_id": true, "customer_id": true,
		"channel": true, "template_id": true, "content": true,
		"status": true, "sent_at": true,
	},
	"sentiment_history": {
		"id": true, "customer_id": true, "source": true,
		"score": true, "label": true, "source_ref_id": true,
		"recorded_at": true,
	},
	"caring_rule": {
		"id": true, "name": true, "condition": true,
		"action": true, "priority": true, "is_active": true,
		"created_at": true,
	},
	"caring_template": {
		"id": true, "name": true, "channel": true,
		"locale": true, "subject": true, "body": true,
		"variables": true, "created_at": true,
	},
	// Shop
	"shopify_customer_map": {
		"id": true, "customer_id": true, "shopify_customer_id": true,
		"shopify_email": true, "synced_at": true, "created_at": true,
	},
	"webhook_event_log": {
		"id": true, "shopify_webhook_id": true, "topic": true,
		"shopify_resource_id": true, "payload": true, "processed_at": true,
		"status": true, "created_at": true,
	},
	// Scheduler
	"tarotist": {
		"id": true, "name": true, "bio": true, "avatar_url": true,
		"specialties": true, "rating": true, "total_reviews": true,
		"hourly_rate": true, "currency": true, "status": true,
		"created_at": true,
	},
	"availability": {
		"id": true, "tarotist_id": true, "day_of_week": true,
		"start_time": true, "end_time": true, "is_recurring": true,
		"specific_date": true, "is_available": true,
	},
	"appointment": {
		"id": true, "customer_id": true, "tarotist_id": true,
		"start_at": true, "end_at": true, "type": true,
		"status": true, "topic": true, "meeting_url": true,
		"notes": true, "created_at": true,
	},
	"review": {
		"id": true, "appointment_id": true, "customer_id": true,
		"tarotist_id": true, "rating": true, "comment": true,
		"created_at": true,
	},
}

// ValidateColumn checks if a column is allowed for the given table.
func ValidateColumn(table, column string) bool {
	cols, ok := columnWhitelist[table]
	if !ok {
		return false
	}
	return cols[column]
}

// BuildSelect constructs a parameterized SELECT query.
func BuildSelect(table string, filters map[string]string, limit, offset int32, orderBy string) (string, []interface{}, error) {
	var b strings.Builder
	var args []interface{}
	paramIdx := 1

	b.WriteString(fmt.Sprintf("SELECT * FROM %s", quoteIdent(table)))

	if len(filters) > 0 {
		b.WriteString(" WHERE ")
		// Sort filter keys for deterministic query generation
		keys := make([]string, 0, len(filters))
		for k := range filters {
			keys = append(keys, k)
		}
		sort.Strings(keys)

		for i, col := range keys {
			if !ValidateColumn(table, col) {
				return "", nil, fmt.Errorf("invalid column %q for table %q", col, table)
			}
			if i > 0 {
				b.WriteString(" AND ")
			}
			b.WriteString(fmt.Sprintf("%s = $%d", quoteIdent(col), paramIdx))
			args = append(args, filters[col])
			paramIdx++
		}
	}

	if orderBy != "" {
		// Parse "col:asc" or "col:desc", default to ASC
		parts := strings.SplitN(orderBy, ":", 2)
		col := parts[0]
		dir := "ASC"
		if len(parts) == 2 && strings.ToUpper(parts[1]) == "DESC" {
			dir = "DESC"
		}
		if !ValidateColumn(table, col) {
			return "", nil, fmt.Errorf("invalid order_by column %q for table %q", col, table)
		}
		b.WriteString(fmt.Sprintf(" ORDER BY %s %s", quoteIdent(col), dir))
	}

	if limit > 0 {
		b.WriteString(fmt.Sprintf(" LIMIT $%d", paramIdx))
		args = append(args, limit)
		paramIdx++
	}
	if offset > 0 {
		b.WriteString(fmt.Sprintf(" OFFSET $%d", paramIdx))
		args = append(args, offset)
	}

	return b.String(), args, nil
}

// BuildCount constructs a parameterized COUNT query.
func BuildCount(table string, filters map[string]string) (string, []interface{}, error) {
	var b strings.Builder
	var args []interface{}
	paramIdx := 1

	b.WriteString(fmt.Sprintf("SELECT COUNT(*) FROM %s", quoteIdent(table)))

	if len(filters) > 0 {
		b.WriteString(" WHERE ")
		keys := make([]string, 0, len(filters))
		for k := range filters {
			keys = append(keys, k)
		}
		sort.Strings(keys)

		for i, col := range keys {
			if !ValidateColumn(table, col) {
				return "", nil, fmt.Errorf("invalid column %q for table %q", col, table)
			}
			if i > 0 {
				b.WriteString(" AND ")
			}
			b.WriteString(fmt.Sprintf("%s = $%d", quoteIdent(col), paramIdx))
			args = append(args, filters[col])
			paramIdx++
		}
	}

	return b.String(), args, nil
}

// BuildInsert constructs a parameterized INSERT query, returning the id.
func BuildInsert(table string, data map[string]interface{}) (string, []interface{}, error) {
	if len(data) == 0 {
		return "", nil, fmt.Errorf("empty insert data for table %q", table)
	}

	// Sort keys for deterministic query
	keys := make([]string, 0, len(data))
	for k := range data {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	var cols, placeholders []string
	var args []interface{}
	paramIdx := 1

	for _, col := range keys {
		if !ValidateColumn(table, col) {
			return "", nil, fmt.Errorf("invalid column %q for table %q", col, table)
		}
		cols = append(cols, quoteIdent(col))
		placeholders = append(placeholders, fmt.Sprintf("$%d", paramIdx))
		args = append(args, data[col])
		paramIdx++
	}

	sql := fmt.Sprintf("INSERT INTO %s (%s) VALUES (%s) RETURNING id",
		quoteIdent(table),
		strings.Join(cols, ", "),
		strings.Join(placeholders, ", "),
	)

	return sql, args, nil
}

// BuildUpdate constructs a parameterized UPDATE query.
func BuildUpdate(table, id string, data map[string]interface{}) (string, []interface{}, error) {
	if len(data) == 0 {
		return "", nil, fmt.Errorf("empty update data for table %q", table)
	}

	keys := make([]string, 0, len(data))
	for k := range data {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	var setClauses []string
	var args []interface{}
	paramIdx := 1

	for _, col := range keys {
		if col == "id" {
			continue // never update id
		}
		if !ValidateColumn(table, col) {
			return "", nil, fmt.Errorf("invalid column %q for table %q", col, table)
		}
		setClauses = append(setClauses, fmt.Sprintf("%s = $%d", quoteIdent(col), paramIdx))
		args = append(args, data[col])
		paramIdx++
	}

	if len(setClauses) == 0 {
		return "", nil, fmt.Errorf("no updatable columns for table %q", table)
	}

	args = append(args, id)
	sql := fmt.Sprintf("UPDATE %s SET %s WHERE id = $%d",
		quoteIdent(table),
		strings.Join(setClauses, ", "),
		paramIdx,
	)

	return sql, args, nil
}

// BuildDelete constructs a parameterized DELETE query.
func BuildDelete(table, id string) (string, []interface{}) {
	sql := fmt.Sprintf("DELETE FROM %s WHERE id = $1", quoteIdent(table))
	return sql, []interface{}{id}
}

// quoteIdent double-quotes a SQL identifier to prevent injection.
func quoteIdent(s string) string {
	// Only allow alphanumeric and underscore
	for _, c := range s {
		if !((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == '_') {
			return `"` + strings.ReplaceAll(s, `"`, `""`) + `"`
		}
	}
	return `"` + s + `"`
}
