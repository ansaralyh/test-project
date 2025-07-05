package main

import (
	"fmt"
	"net/http"
)

func main() {
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, "Private Page")
	})

	fmt.Println("Server running on port 80")
	err := http.ListenAndServe(":80", nil)
	if err != nil {
		panic(err)
	}
}
