package storage

import (
	"testing"
)

func TestBuildSelect_NoFilters(t *testing.T) {
	sql, args, err := BuildSelect("customer", nil, 10, 0, "")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	expected := `SELECT * FROM "customer" LIMIT $1`
	if sql != expected {
		t.Errorf("got %q, want %q", sql, expected)
	}
	if len(args) != 1 || args[0] != int32(10) {
		t.Errorf("got args %v, want [10]", args)
	}
}

func TestBuildSelect_WithFilters(t *testing.T) {
	sql, args, err := BuildSelect("customer", map[string]string{"status": "active"}, 20, 5, "created_at:desc")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	expected := `SELECT * FROM "customer" WHERE "status" = $1 ORDER BY "created_at" DESC LIMIT $2 OFFSET $3`
	if sql != expected {
		t.Errorf("got %q, want %q", sql, expected)
	}
	if len(args) != 3 {
		t.Fatalf("got %d args, want 3", len(args))
	}
	if args[0] != "active" {
		t.Errorf("args[0] = %v, want 'active'", args[0])
	}
}

func TestBuildSelect_InvalidColumn(t *testing.T) {
	_, _, err := BuildSelect("customer", map[string]string{"'; DROP TABLE--": "x"}, 10, 0, "")
	if err == nil {
		t.Fatal("expected error for invalid column")
	}
}

func TestBuildInsert(t *testing.T) {
	data := map[string]interface{}{
		"email":        "test@example.com",
		"display_name": "Test",
	}
	sql, args, err := BuildInsert("customer", data)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	// Keys sorted: display_name, email
	expected := `INSERT INTO "customer" ("display_name", "email") VALUES ($1, $2) RETURNING id`
	if sql != expected {
		t.Errorf("got %q, want %q", sql, expected)
	}
	if len(args) != 2 {
		t.Errorf("got %d args, want 2", len(args))
	}
}

func TestBuildUpdate(t *testing.T) {
	data := map[string]interface{}{"status": "suspended"}
	sql, args, err := BuildUpdate("customer", "abc-123", data)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	expected := `UPDATE "customer" SET "status" = $1 WHERE id = $2`
	if sql != expected {
		t.Errorf("got %q, want %q", sql, expected)
	}
	if len(args) != 2 || args[0] != "suspended" || args[1] != "abc-123" {
		t.Errorf("got args %v", args)
	}
}

func TestBuildDelete(t *testing.T) {
	sql, args := BuildDelete("customer", "abc-123")
	expected := `DELETE FROM "customer" WHERE id = $1`
	if sql != expected {
		t.Errorf("got %q, want %q", sql, expected)
	}
	if len(args) != 1 || args[0] != "abc-123" {
		t.Errorf("got args %v", args)
	}
}

func TestBuildCount(t *testing.T) {
	sql, args, err := BuildCount("appointment", map[string]string{"status": "confirmed", "tarotist_id": "t1"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	expected := `SELECT COUNT(*) FROM "appointment" WHERE "status" = $1 AND "tarotist_id" = $2`
	if sql != expected {
		t.Errorf("got %q, want %q", sql, expected)
	}
	if len(args) != 2 {
		t.Errorf("got %d args, want 2", len(args))
	}
}

func TestValidateColumn(t *testing.T) {
	if !ValidateColumn("customer", "email") {
		t.Error("expected email to be valid for customer")
	}
	if ValidateColumn("customer", "nonexistent") {
		t.Error("expected nonexistent to be invalid for customer")
	}
	if ValidateColumn("unknown_table", "id") {
		t.Error("expected unknown table to be invalid")
	}
}
