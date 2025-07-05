package autoconfig

import (
	"automation-hub-nginxconfigmanager/internal/app/config"
	"automation-hub-nginxconfigmanager/internal/app/entities"
	"context"
	"encoding/json"
	"fmt"
	"github.com/IBM/sarama"
	"github.com/docker/docker/client"
	"log"
	"os"
	"path/filepath"
	"text/template"
)

type ConfigAction int

const (
	Add ConfigAction = iota
	Remove
	Update
)

func manageConfig(action ConfigAction, auto entities.Automation) error {
	var err error
	log.Printf("Managing config: %v\n", auto)
	err = auto.Validate()
	if err != nil {
		return err
	}
	switch action {
	case Add:
		err = addConfig(auto)
	case Remove:
		err = removeConfig(auto.URLPath)
	case Update:
		err = updateConfig(auto)
	default:
		return fmt.Errorf("invalid action")
	}

	if err != nil {
		return err
	}

	return reloadNginx()
}

func addConfig(auto entities.Automation) error {

	filePath := filepath.Join(config.AppConfig.ConfigDir, auto.URLPath+".conf")
	tmpl, err := template.New("config").Parse(configTemplate)
	if err != nil {
		return err
	}

	file, err := os.Create(filePath)
	if err != nil {
		return err
	}
	defer func(file *os.File) {
		err := file.Close()
		if err != nil {

		}
	}(file)

	return tmpl.Execute(file, auto)
}

func removeConfig(name string) error {
	filePath := filepath.Join(config.AppConfig.ConfigDir, name+".conf")
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		return fmt.Errorf("config %s not found", name)
	}
	return os.Remove(filePath)
}

func updateConfig(auto entities.Automation) error {
	if err := removeConfig(auto.OldUrlPath); err != nil {
		return err
	}
	return addConfig(auto)
}

func reloadNginx() error {
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return err
	}
	defer cli.Close()

	return cli.ContainerKill(context.Background(), config.AppConfig.NginxContainer, "HUP")
}

func processMessage(msg *sarama.ConsumerMessage) {
	var event entities.AutomationEvent
	err := json.Unmarshal(msg.Value, &event)
	if err != nil {
		log.Printf("Failed to unmarshal message: %v", err)
		return
	}

	switch event.Type {
	case entities.CreateEvent:
		err = manageConfig(Add, *event.Automation)
	case entities.UpdateEvent:
		err = manageConfig(Update, *event.Automation)
	case entities.DeleteEvent:
		err = manageConfig(Remove, *event.Automation)
	default:
		log.Printf("Unknown event type: %s", event.Type)
		return
	}

	if err != nil {
		log.Printf("Failed to process event: %v", err)
	}
}
