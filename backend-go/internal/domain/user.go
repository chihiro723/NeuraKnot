package domain

import (
	"time"
)

// User ユーザーエンティティ
type User struct {
	ID        int       `json:"id"`
	Email     string    `json:"email"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// UserRepository ユーザーリポジトリのインターフェース
type UserRepository interface {
	GetAll() ([]*User, error)
	GetByID(id int) (*User, error)
	Create(user *User) error
	Update(user *User) error
	Delete(id int) error
}

// UserUsecase ユーザーユースケースのインターフェース
type UserUsecase interface {
	GetUsers() ([]*User, error)
	GetUserByID(id int) (*User, error)
	CreateUser(email, name string) (*User, error)
	UpdateUser(id int, email, name string) (*User, error)
	DeleteUser(id int) error
}

