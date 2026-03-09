package middleware

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"os"

	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
)

// AuthUnaryInterceptor validates service-to-service auth tokens.
// In development mode, auth is skipped.
func AuthUnaryInterceptor(logger *zap.Logger) grpc.UnaryServerInterceptor {
	secret := os.Getenv("DAL_AUTH_SECRET")
	isDev := os.Getenv("ENV") != "production"

	return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
		// Skip auth in dev mode or if no secret configured
		if isDev || secret == "" {
			return handler(ctx, req)
		}

		// Skip health checks
		if info.FullMethod == "/dal.v1.DataAccessService/Check" ||
			info.FullMethod == "/grpc.health.v1.Health/Check" {
			return handler(ctx, req)
		}

		if err := validateToken(ctx, secret); err != nil {
			logger.Warn("auth failed",
				zap.String("method", info.FullMethod),
				zap.Error(err),
			)
			return nil, err
		}

		return handler(ctx, req)
	}
}

// AuthStreamInterceptor validates service-to-service auth tokens for streams.
func AuthStreamInterceptor(logger *zap.Logger) grpc.StreamServerInterceptor {
	secret := os.Getenv("DAL_AUTH_SECRET")
	isDev := os.Getenv("ENV") != "production"

	return func(srv interface{}, ss grpc.ServerStream, info *grpc.StreamServerInfo, handler grpc.StreamHandler) error {
		if isDev || secret == "" {
			return handler(srv, ss)
		}

		if err := validateToken(ss.Context(), secret); err != nil {
			logger.Warn("stream auth failed",
				zap.String("method", info.FullMethod),
				zap.Error(err),
			)
			return err
		}

		return handler(srv, ss)
	}
}

func validateToken(ctx context.Context, secret string) error {
	md, ok := metadata.FromIncomingContext(ctx)
	if !ok {
		return status.Error(codes.Unauthenticated, "missing metadata")
	}

	tokens := md.Get("x-service-token")
	if len(tokens) == 0 {
		return status.Error(codes.Unauthenticated, "missing service token")
	}

	// Token format: "service:timestamp:hmac"
	token := tokens[0]
	expected := computeHMAC(token[:len(token)-65], secret) // everything before last :hmac
	if len(token) < 65 || !hmac.Equal([]byte(token[len(token)-64:]), []byte(expected)) {
		return status.Error(codes.Unauthenticated, "invalid service token")
	}

	return nil
}

func computeHMAC(message, secret string) string {
	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(message))
	return hex.EncodeToString(h.Sum(nil))
}
