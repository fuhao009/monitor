package main

import (
	"log"
	"net/http"

	httpapi "monitor-console/backend/internal/http"
)

func main() {
	server := &http.Server{
		Addr:    ":8080",
		Handler: httpapi.NewRouter(),
	}

	log.Println("monitor-console backend listening on :8080")
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatal(err)
	}
}
