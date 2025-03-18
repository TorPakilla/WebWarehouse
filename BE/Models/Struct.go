package Models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Branches model (ตารางหลัก)
type Branches struct {
	BranchID uuid.UUID `gorm:"type:uuid;primaryKey" json:"branch_id"`
	BName    string    `json:"b_name"`
	Location string    `json:"location"`

	ImageURL string `json:"image_url"`
	// ไม่ต้องมี Foreign Key ไปยัง Employees
	Employees []Employees `gorm:"foreignKey:BranchID;constraint:OnDelete:CASCADE" json:"employees"`
}

func (Branches) TableName() string {
	return `"Branches"`
}

func (s *Branches) BeforeCreate(tx *gorm.DB) (err error) {
	s.BranchID = uuid.New()
	return
}

// Employees model (พนักงานอ้างอิง Branches)
type Employees struct {
	EmployeesID uuid.UUID `gorm:"type:uuid;primaryKey" json:"employees_id"`
	Username    string    `json:"username"`
	Password    string    `json:"password"`
	Name        string    `json:"name"`
	Role        string    `json:"role"`
	Salary      float64   `json:"salary"`
	CreatedAt   time.Time `json:"created_at"`

	BranchID uuid.UUID `gorm:"type:uuid;not null" json:"branch_id"`
	Branch   Branches  `gorm:"foreignKey:BranchID;references:BranchID;constraint:OnDelete:CASCADE" json:"branch"`
}

func (Employees) TableName() string {
	return `"Employees"`
}

// Product model
type Product struct {
	ProductID   string        `gorm:"type:uuid;primaryKey" json:"product_id"`
	ProductName string        `json:"product_name"`
	Description string        `json:"description"`
	Image       []byte        `json:"image"`
	CreatedAt   time.Time     `json:"created_at"`
	Inventory   []Inventory   `gorm:"foreignKey:ProductID;constraint:OnDelete:CASCADE" json:"inventory"`
	ProductUnit []ProductUnit `gorm:"foreignKey:ProductID;constraint:OnDelete:CASCADE" json:"product_unit"`
}

func (Product) TableName() string {
	return "Product"
}

func (s *Product) BeforeCreate(tx *gorm.DB) (err error) {
	s.ProductID = uuid.New().String()
	return
}

// ProductUnit model
type ProductUnit struct {
	ProductUnitID   string    `gorm:"primaryKey;column:product_unit_id" json:"product_unit_id"`
	ProductID       string    `gorm:"column:product_id;constraint:OnDelete:CASCADE" json:"product_id"`
	Type            string    `gorm:"column:type" json:"type"`
	InitialQuantity int       `gorm:"column:initial_quantity" json:"initial_quantity"`
	ConversRate     int       `gorm:"column:convers_rate" json:"convers_rate"`
	CreatedAt       time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt       time.Time `gorm:"column:updated_at" json:"updated_at"`
}

func (ProductUnit) TableName() string {
	return "ProductUnit"
}

func (p *ProductUnit) BeforeCreate(tx *gorm.DB) (err error) {
	p.ProductUnitID = uuid.New().String()
	return
}

// Inventory model
type Inventory struct {
	InventoryID string    `gorm:"primaryKey;column:inventory_id" json:"inventory_id"`
	ProductID   string    `gorm:"column:product_id;constraint:OnDelete:CASCADE" json:"product_id"`
	BranchID    string    `gorm:"column:branch_id" json:"branch_id"`
	Quantity    int       `gorm:"column:quantity" json:"quantity"`
	Price       float64   `gorm:"column:price" json:"price"`
	CreatedAt   time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt   time.Time `gorm:"column:updated_at" json:"updated_at"`
}

func (Inventory) TableName() string {
	return "Inventory"
}

func (s *Inventory) BeforeCreate(tx *gorm.DB) (err error) {
	s.InventoryID = uuid.New().String()
	return
}

// Supplier model
type Supplier struct {
	SupplierID       string            `gorm:"type:uuid;primaryKey" json:"supplier_id"`
	Name             string            `json:"name"`
	ProductID        string            `gorm:"type:uuid" json:"product_id"`
	PricePallet      float64           `json:"price_pallet"`
	ProductSuppliers []ProductSupplier `gorm:"foreignKey:SupplierID" json:"product_suppliers"`
}

func (Supplier) TableName() string {
	return "Supplier"
}

type Order struct {
	OrderID     string     `gorm:"type:uuid;primaryKey" json:"order_id"`
	OrderNumber string     `json:"order_number"`
	Status      string     `json:"status"`
	SupplierID  uuid.UUID  `gorm:"type:uuid" json:"supplier_id"`
	EmployeesID *uuid.UUID `gorm:"type:uuid" json:"employees_id"`
	TotalAmount float64    `json:"total_amount"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`

	// Relationships
	OrderItems []OrderItem `gorm:"foreignKey:OrderID;constraint:OnDelete:CASCADE" json:"order_items"` // OnDelete:CASCADE
}

func (Order) TableName() string {
	return `"Order"`
}

// BeforeCreate sets a new UUID before creating the record
func (s *Order) BeforeCreate(tx *gorm.DB) (err error) {
	s.OrderID = uuid.New().String()
	return
}

type OrderItem struct {
	OrderItemID string    `gorm:"type:uuid;primaryKey" json:"order_item_id"`
	OrderID     string    `gorm:"type:uuid;not null;constraint:OnDelete:CASCADE" json:"order_id"` // OnDelete:CASCADE
	ProductID   string    `gorm:"type:uuid;not null" json:"product_id"`
	Quantity    int       `json:"quantity"`
	ConversRate float64   `json:"convers_rate"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (OrderItem) TableName() string {
	return "OrderItem"
}

func (s *OrderItem) BeforeCreate(tx *gorm.DB) (err error) {
	s.OrderItemID = uuid.New().String()
	return
}

// Shipment model
type Shipment struct {
	ShipmentID     string    `gorm:"column:shipment_id;primaryKey;type:uuid;not null" json:"shipment_id"`
	ShipmentNumber string    `json:"shipment_number"`
	FromBranchID   string    `json:"from_branch_id"`
	ToBranchID     string    `json:"to_branch_id"`
	Status         string    `json:"status"`
	ShipmentDate   time.Time `json:"shipment_date"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`

	// Relationships
	ShipmentItems []ShipmentItem `gorm:"foreignKey:ShipmentID;constraint:OnDelete:CASCADE" json:"shipment_items"`
}

func (Shipment) TableName() string {
	return "Shipment"
}

func (s *Shipment) BeforeCreate(tx *gorm.DB) (err error) {
	s.ShipmentID = uuid.New().String()
	return
}

// ShipmentItem model
type ShipmentItem struct {
	ShipmentListID       string    `gorm:"primaryKey;type:uuid" json:"shipment_list_id"`
	ShipmentID           string    `gorm:"column:shipment_id;constraint:OnDelete:CASCADE" json:"shipment_id"`
	WarehouseInventoryID string    `json:"warehouse_inventory_id"`
	PosInventoryID       string    `json:"pos_inventory_id"`
	ProductUnitID        string    `json:"product_unit_id"`
	Status               string    `json:"status"`
	Quantity             int       `json:"quantity"`
	CreatedAt            time.Time `json:"created_at"`
	UpdatedAt            time.Time `json:"updated_at"`
}

func (ShipmentItem) TableName() string {
	return "ShipmentItem"
}

func (s *ShipmentItem) BeforeCreate(tx *gorm.DB) (err error) {
	s.ShipmentListID = uuid.New().String()
	return
}

type ProductSupplier struct {
	ID          string  `gorm:"type:uuid;primaryKey" json:"id"`
	SupplierID  string  `gorm:"type:uuid" json:"supplier_id"`
	ProductID   string  `gorm:"type:uuid" json:"product_id"`
	PricePallet float64 `json:"price_pallet"`

	Product Product `gorm:"foreignKey:ProductID;references:ProductID" json:"product"`
}

func (ProductSupplier) TableName() string {
	return "ProductSupplier"
}
