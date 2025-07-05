package entities

import (
	"fmt"
)

type Automation struct {
	Name       string `json:"name"`
	URLPath    string `json:"urlPath"`
	Host       string `json:"host"`
	Port       int    `json:"port"`
	OldUrlPath string `json:"oldUrlPath,omitempty"`
}

func (a *Automation) Validate() error {
	if a.Name == "" {
		return fmt.Errorf("name is required")
	}
	if a.Host == "" {
		return fmt.Errorf("hostname is required")
	}
	if a.URLPath == "" {
		return fmt.Errorf("URL path is required")
	}
	if a.Port <= 0 || a.Port > 65535 {
		return fmt.Errorf("error: Port %d is not valid", a.Port)
	}
	return nil
}
