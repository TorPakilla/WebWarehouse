package Func

import (
	"Api/Models"
	"io"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ProductsPos struct {
	ProductID   uuid.UUID `json:"product_id"`
	ProductName string    `json:"product_name"`
	Description string    `json:"description"`
	Price       float64   `json:"price"`
	UnitsPerBox int       `json:"units_per_box"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	ImageUrl    string    `json:"image_url"` // เปลี่ยนชื่อฟิลด์ให้ตรงกับ JSON
	CategoryID  uuid.UUID `json:"category_id"`
}

// สร้าง Product พร้อมกับ Inventory และ ProductUnit
func AddProductWithInventory(db *gorm.DB, c *fiber.Ctx) error {
	// กำหนด struct สำหรับ request ทั้งแบบ JSON และ form-data
	type ProductRequest struct {
		ProductName     string  `json:"product_name"`
		Description     string  `json:"description"`
		Type            string  `json:"type"`
		BranchID        string  `json:"branch_id"`
		InitialQuantity int     `json:"initial_quantity"`
		Price           float64 `json:"price"`
		// Image field สำหรับกรณี JSON (ถ้ามี base64 หรือ URL) แต่ใน form-data จะรับผ่าน c.FormFile
		Image []byte `json:"-"`
	}

	var req ProductRequest

	// ตรวจสอบ Content-Type เพื่อรองรับ JSON หรือ form-data
	if c.Is("json") {
		// รับ JSON body
		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
		}
		// ตรวจสอบค่า initial_quantity
		if req.InitialQuantity <= 0 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid initial_quantity"})
		}
		// ตรวจสอบ price
		if req.Price <= 0 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid price"})
		}
	} else {
		// รับข้อมูลจาก form-data
		req.ProductName = c.FormValue("product_name")
		req.Description = c.FormValue("description")
		req.Type = c.FormValue("type")
		req.BranchID = c.FormValue("branch_id")

		// Trim และแปลงค่า initial_quantity
		initialStr := strings.TrimSpace(c.FormValue("initial_quantity"))
		initialQuantity, err := strconv.Atoi(initialStr)
		if err != nil || initialQuantity <= 0 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid initial_quantity"})
		}
		req.InitialQuantity = initialQuantity

		// แปลงราคา
		priceStr := strings.TrimSpace(c.FormValue("price"))
		price, err := strconv.ParseFloat(priceStr, 64)
		if err != nil || price <= 0 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid price"})
		}
		req.Price = price

		// ดึงไฟล์รูปภาพ (ถ้ามี)
		file, err := c.FormFile("image")
		if err == nil && file != nil {
			fileContent, err := file.Open()
			if err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to open uploaded file"})
			}
			defer fileContent.Close()
			req.Image, err = io.ReadAll(fileContent)
			if err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to read uploaded file"})
			}
		}
	}

	// 1. สร้าง Product
	product := Models.Product{
		ProductName: req.ProductName,
		Description: req.Description,
		Image:       req.Image,
		CreatedAt:   time.Now(),
	}
	if err := db.Create(&product).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create product"})
	}
	if err := db.Last(&product).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch created product"})
	}

	// 2. กำหนด ConversRate ตามประเภทของสินค้า
	var conversRate int
	switch req.Type {
	case "Pallet":
		conversRate = 12
	case "Box":
		conversRate = 6
	case "Pieces":
		conversRate = 1
	default:
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid type"})
	}

	// 3. สร้าง ProductUnit ที่เชื่อมโยงกับ Product ที่สร้างขึ้น
	productUnit := Models.ProductUnit{
		ProductID:       product.ProductID,
		Type:            req.Type,
		InitialQuantity: req.InitialQuantity,
		ConversRate:     conversRate,
		CreatedAt:       time.Now(),
	}
	if err := db.Create(&productUnit).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create product unit"})
	}

	// 4. คำนวณและสร้าง Inventory ที่เชื่อมโยงกับ Product และ ProductUnit
	calculatedQuantity := req.InitialQuantity * conversRate
	inventory := Models.Inventory{
		ProductID: product.ProductID,
		BranchID:  req.BranchID,
		Quantity:  calculatedQuantity,
		Price:     req.Price,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	if err := db.Create(&inventory).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create inventory"})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message":     "Product, Product Unit, and Inventory created successfully",
		"product":     product,
		"productUnit": productUnit,
		"inventory":   inventory,
	})
}

func GetProductsBySupplier(db *gorm.DB, c *fiber.Ctx) error {
	supplierID := c.Query("supplier_id")
	if supplierID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Supplier ID is required"})
	}

	// ✅ ตรวจสอบ supplier_id เป็น UUID ที่ถูกต้อง
	parsedUUID, err := uuid.Parse(supplierID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid supplier UUID format"})
	}

	// ✅ ใช้ `JOIN` กับ `"ProductSupplier"` และ `"Product"`
	var products []Models.Product
	err = db.Table(`"Product"`). // 🔹 ใช้ `""` ครอบ "Product"
					Select(`"Product".*`).
					Joins(`JOIN "ProductSupplier" ON "ProductSupplier".product_id = "Product".product_id`).
					Where(`"ProductSupplier".supplier_id = ?`, parsedUUID).
					Find(&products).Error

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch products: " + err.Error()})
	}

	return c.JSON(fiber.Map{"products": products})
}

// อัปเดต Product
// Updated UpdateProduct function
func UpdateProduct(db *gorm.DB, c *fiber.Ctx) error {
	id := c.Params("id")

	// Get existing product
	var product Models.Product
	if err := db.Where("product_id = ?", id).First(&product).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Product not found"})
	}

	// Extract form data
	productName := c.FormValue("product_name")
	description := c.FormValue("description")
	productType := c.FormValue("type")
	priceStr := strings.TrimSpace(c.FormValue("price"))
	initialQtyStr := strings.TrimSpace(c.FormValue("initial_quantity"))

	price, _ := strconv.ParseFloat(priceStr, 64)
	initialQty, _ := strconv.Atoi(initialQtyStr)

	// Optionally, handle file upload (if any)
	var image []byte
	file, err := c.FormFile("image")
	if err == nil && file != nil {
		fileContent, err := file.Open()
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to open uploaded file"})
		}
		defer fileContent.Close()
		image, err = io.ReadAll(fileContent)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to read uploaded file"})
		}
	}

	// Update product fields
	if productName != "" {
		product.ProductName = productName
	}
	if description != "" {
		product.Description = description
	}
	if len(image) > 0 {
		product.Image = image
	}
	if err := db.Save(&product).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update product"})
	}

	// Update associated ProductUnit and Inventory
	var productUnit Models.ProductUnit
	if err := db.Where("product_id = ?", id).First(&productUnit).Error; err == nil {
		if productType != "" {
			productUnit.Type = productType
			switch productType {
			case "Pallet":
				productUnit.ConversRate = 12
			case "Box":
				productUnit.ConversRate = 6
			case "Pieces":
				productUnit.ConversRate = 1
			}
		}
		if initialQty > 0 {
			productUnit.InitialQuantity = initialQty
		}
		if err := db.Save(&productUnit).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update product unit"})
		}
	}

	var inventory Models.Inventory
	if err := db.Where("product_id = ?", id).First(&inventory).Error; err == nil {
		if price > 0 {
			inventory.Price = price
		}
		if err := db.Save(&inventory).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update inventory"})
		}
	}

	return c.JSON(fiber.Map{"message": "Product updated successfully"})
}

// ดึงข้อมูล Product ทั้งหมด
func LookProducts(db *gorm.DB, c *fiber.Ctx) error {
	var products []Models.Product
	if err := db.Preload("ProductUnit").Preload("Inventory").Find(&products).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch products"})
	}
	return c.JSON(fiber.Map{"products": products})
}

func LookProductsPos(posDB *gorm.DB, c *fiber.Ctx) error {
	var products []ProductsPos
	if err := posDB.Table("Products").Find(&products).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch products"})
	}
	return c.JSON(fiber.Map{"products": products})
}

// ดึงข้อมูล ProductUnit ทั้งหมด
func LookProductUnit(db *gorm.DB, c *fiber.Ctx) error {
	var products []Models.ProductUnit
	if err := db.Find(&products).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch ProductUnit"})
	}
	return c.JSON(fiber.Map{"products": products})
}

// ลบ Product
func DeleteProduct(db *gorm.DB, c *fiber.Ctx) error {
	id := c.Params("id")
	var product Models.Product
	if err := db.Where("product_id = ?", id).First(&product).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Product not found"})
	}

	if err := db.Delete(&product).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete product"})
	}

	return c.JSON(fiber.Map{"message": "Product deleted successfully"})
}

func GetProductByID(db *gorm.DB, c *fiber.Ctx) error {
	id := c.Params("id")

	var product Models.Product
	err := db.Preload("ProductUnit").Preload("Inventory").
		Where("product_id = ?", id).First(&product).Error

	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Product not found"})
	}

	return c.JSON(fiber.Map{"product": product})
}

func ProductRouter(app fiber.Router, db *gorm.DB, posDB *gorm.DB) {
	app.Post("/Product", func(c *fiber.Ctx) error {
		return AddProductWithInventory(db, c)
	})
	app.Get("/Product", func(c *fiber.Ctx) error {
		return LookProducts(db, c)
	})

	app.Get("/ProductsBySupplier", func(c *fiber.Ctx) error {
		return GetProductsBySupplier(db, c)
	})

	app.Get("/Products", func(c *fiber.Ctx) error {
		return LookProductsPos(posDB, c)
	})

	app.Get("/ProductUnit", func(c *fiber.Ctx) error {
		return LookProductUnit(db, c)
	})

	app.Put("/Product/:id", func(c *fiber.Ctx) error {
		return UpdateProduct(db, c)
	})
	app.Delete("/Product/:id", func(c *fiber.Ctx) error {
		return DeleteProduct(db, c)
	})
}
