package autoconfig

import (
	"automation-hub-nginxconfigmanager/internal/app/config"
	"github.com/IBM/sarama"
	"log"
)

type Consumer struct {
	consumer sarama.Consumer
	topic    string
}

func NewConsumer(brokers []string, topic string) (*Consumer, error) {
	consumer, err := sarama.NewConsumer(brokers, nil)
	if err != nil {
		return nil, err
	}

	return &Consumer{
		consumer: consumer,
		topic:    topic,
	}, nil
}

func DefaultConsumer() *Consumer {
	consumer, err := NewConsumer(config.AppConfig.Brokers, config.AppConfig.Topic)
	if err != nil {
		log.Fatalf("Failed to create default consumer: %v", err)
	}
	return consumer
}

func (c *Consumer) Start() {
	partitionConsumer, err := c.consumer.ConsumePartition(c.topic, 0, sarama.OffsetNewest)
	if err != nil {
		log.Fatalf("Failed to start consumer: %v", err)
	}
	defer partitionConsumer.Close()

	for {
		select {
		case msg := <-partitionConsumer.Messages():
			processMessage(msg)
		}
	}
}

func (c *Consumer) Close() error {
	return c.consumer.Close()
}
