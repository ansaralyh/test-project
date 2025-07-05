package entities

type AutomationEventType string

const (
	CreateEvent AutomationEventType = "create"
	UpdateEvent AutomationEventType = "update"
	DeleteEvent AutomationEventType = "delete"
)

type AutomationEvent struct {
	Type       AutomationEventType `json:"type"`
	Automation *Automation         `json:"automation"`
}
