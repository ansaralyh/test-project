package authentication

import (
	"automation-hub-idp/internal/app/dto"
	"github.com/google/uuid"
	"time"
)

type IService interface {
	Register(userDTO dto.UserDTO) (*dto.UserResponse, error)
	Login(email, password string) (*dto.TokenDetails, error)
	Logout(accessToken string) error
	RefreshToken(refreshToken string) (*dto.TokenDetails, error)
	IsUserAuthenticated(accessToken string) (bool, error)
	RequestPasswordReset(email string) (string, time.Time, error)
	ConfirmPasswordReset(token, newPassword string) error
	ChangePassword(accessToken string, newPassword string) error
	GetIdFromToken(accessToken string) (uuid.UUID, error)
}
