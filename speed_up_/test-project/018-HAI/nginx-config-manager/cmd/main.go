package main

import (
	"automation-hub-nginxconfigmanager/internal/app/autoconfig"
	"automation-hub-nginxconfigmanager/internal/app/config"
	"log"
)

func main() {
	config.Init()

	consumer := autoconfig.DefaultConsumer()
	defer consumer.Close()

	log.Println("Starting Kafka consumer...")
	consumer.Start()
}
