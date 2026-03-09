//go:build integration

// Package integration — DAL end-to-end tests.
// Requires: PostgreSQL, Redis, and Kafka running (docker compose up).
//
// Run: go test -tags=integration -v ./tests/integration/...
package integration

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"testing"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	dalv1 "github.com/tarotfriend/data-access-layer/pkg/proto/dal/v1"
)

func getDALAddr() string {
	addr := os.Getenv("DAL_ADDR")
	if addr == "" {
		return "localhost:4000"
	}
	return addr
}

func newClient(t *testing.T) dalv1.DataAccessServiceClient {
	t.Helper()
	conn, err := grpc.NewClient(getDALAddr(),
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
	if err != nil {
		t.Fatalf("failed to connect to DAL: %v", err)
	}
	t.Cleanup(func() { conn.Close() })
	return dalv1.NewDataAccessServiceClient(conn)
}

// TestHealthCheck verifies the Check RPC returns SERVING.
func TestHealthCheck(t *testing.T) {
	client := newClient(t)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	resp, err := client.Check(ctx, &dalv1.CheckRequest{})
	if err != nil {
		t.Fatalf("Check failed: %v", err)
	}

	if resp.Status != dalv1.CheckResponse_SERVING_STATUS_SERVING {
		t.Errorf("expected SERVING, got %v", resp.Status)
	}

	// Should have details for all 5 DBs + Redis
	if len(resp.Details) < 5 {
		t.Errorf("expected at least 5 health details, got %d: %v", len(resp.Details), resp.Details)
	}

	for key, val := range resp.Details {
		t.Logf("  %s: %s", key, val)
	}
}

// TestQueryRoundTrip verifies Write followed by Query returns the record.
func TestQueryRoundTrip(t *testing.T) {
	client := newClient(t)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Write a customer
	payload, _ := json.Marshal(map[string]interface{}{
		"email":        "roundtrip@test.com",
		"display_name": "Round Trip",
		"locale":       "zh-TW",
		"tier":         "free",
		"status":       "active",
	})

	writeResp, err := client.Write(ctx, &dalv1.WriteRequest{
		Service:   "customer",
		Entity:    "customer",
		Operation: "create",
		Payload:   payload,
	})
	if err != nil {
		t.Fatalf("Write failed: %v", err)
	}
	if !writeResp.Success {
		t.Fatalf("Write not successful: %s", writeResp.Error)
	}
	t.Logf("Created customer ID: %s", writeResp.Id)

	// Query with no cache
	queryResp, err := client.Query(ctx, &dalv1.QueryRequest{
		Service:     "customer",
		Entity:      "customer",
		Filters:     map[string]string{"email": "roundtrip@test.com"},
		Limit:       10,
		CachePolicy: dalv1.CachePolicy_CACHE_POLICY_NO_CACHE,
	})
	if err != nil {
		t.Fatalf("Query failed: %v", err)
	}
	if queryResp.Total == 0 {
		t.Fatal("expected at least 1 record, got 0")
	}
	if queryResp.FromCache {
		t.Error("expected from_cache=false with NO_CACHE policy")
	}

	// Verify record content
	var record map[string]interface{}
	if err := json.Unmarshal(queryResp.Records[0], &record); err != nil {
		t.Fatalf("failed to unmarshal record: %v", err)
	}
	if record["email"] != "roundtrip@test.com" {
		t.Errorf("expected email 'roundtrip@test.com', got %v", record["email"])
	}

	// Cleanup
	deletePayload, _ := json.Marshal(map[string]interface{}{"id": writeResp.Id})
	client.Write(ctx, &dalv1.WriteRequest{
		Service:   "customer",
		Entity:    "customer",
		Operation: "delete",
		Payload:   deletePayload,
	})
}

// TestCacheHitOnSecondQuery verifies CACHE_FIRST returns from cache on 2nd call.
func TestCacheHitOnSecondQuery(t *testing.T) {
	client := newClient(t)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Create test data
	payload, _ := json.Marshal(map[string]interface{}{
		"email":        "cache-test@test.com",
		"display_name": "Cache Test",
		"locale":       "zh-TW",
		"tier":         "free",
		"status":       "active",
	})
	writeResp, err := client.Write(ctx, &dalv1.WriteRequest{
		Service:   "customer",
		Entity:    "customer",
		Operation: "create",
		Payload:   payload,
	})
	if err != nil {
		t.Fatalf("Write failed: %v", err)
	}

	filters := map[string]string{"email": "cache-test@test.com"}

	// First query — cache miss (populates cache)
	resp1, err := client.Query(ctx, &dalv1.QueryRequest{
		Service:     "customer",
		Entity:      "customer",
		Filters:     filters,
		Limit:       10,
		CachePolicy: dalv1.CachePolicy_CACHE_POLICY_CACHE_FIRST,
	})
	if err != nil {
		t.Fatalf("Query 1 failed: %v", err)
	}
	if resp1.FromCache {
		t.Log("Query 1: unexpectedly from cache (may already be cached)")
	}

	// Second query — should hit cache
	resp2, err := client.Query(ctx, &dalv1.QueryRequest{
		Service:     "customer",
		Entity:      "customer",
		Filters:     filters,
		Limit:       10,
		CachePolicy: dalv1.CachePolicy_CACHE_POLICY_CACHE_FIRST,
	})
	if err != nil {
		t.Fatalf("Query 2 failed: %v", err)
	}
	if !resp2.FromCache {
		t.Error("expected Query 2 to be from cache")
	}

	// Cleanup
	deletePayload, _ := json.Marshal(map[string]interface{}{"id": writeResp.Id})
	client.Write(ctx, &dalv1.WriteRequest{
		Service:   "customer",
		Entity:    "customer",
		Operation: "delete",
		Payload:   deletePayload,
	})
}

// TestBatchWrite verifies BatchWrite processes multiple writes with responses.
func TestBatchWrite(t *testing.T) {
	client := newClient(t)
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	stream, err := client.BatchWrite(ctx)
	if err != nil {
		t.Fatalf("BatchWrite stream failed: %v", err)
	}

	var createdIDs []string
	count := 5

	// Send N writes
	for i := 0; i < count; i++ {
		payload, _ := json.Marshal(map[string]interface{}{
			"email":        fmt.Sprintf("batch-%d@test.com", i),
			"display_name": fmt.Sprintf("Batch User %d", i),
			"locale":       "zh-TW",
			"tier":         "free",
			"status":       "active",
		})
		if err := stream.Send(&dalv1.BatchWriteRequest{
			Service:   "customer",
			Entity:    "customer",
			Operation: "create",
			Payload:   payload,
		}); err != nil {
			t.Fatalf("Send %d failed: %v", i, err)
		}
	}

	stream.CloseSend()

	// Receive N responses
	for {
		resp, err := stream.Recv()
		if err != nil {
			break
		}
		if !resp.Success {
			t.Errorf("batch write failed: %s", resp.Error)
			continue
		}
		createdIDs = append(createdIDs, resp.Id)
	}

	if len(createdIDs) != count {
		t.Errorf("expected %d responses, got %d", count, len(createdIDs))
	}

	// Cleanup
	for _, id := range createdIDs {
		deletePayload, _ := json.Marshal(map[string]interface{}{"id": id})
		client.Write(ctx, &dalv1.WriteRequest{
			Service:   "customer",
			Entity:    "customer",
			Operation: "delete",
			Payload:   deletePayload,
		})
	}
}
