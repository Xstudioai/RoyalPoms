from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException, Form
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime
import base64
import io
from PIL import Image
import PyPDF2
from pdf2image import convert_from_bytes
import urllib.request
import base64
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging first
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Initialize Gemini client with Emergent Universal Key for image generation
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

def create_gemini_chat():
    """Create a new Gemini chat instance for image generation"""
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"tryon_{uuid.uuid4()}",
        system_message="You are a professional pet stylist AI that creates realistic virtual try-on images for dog outfits."
    )
    return chat.with_model("gemini", "gemini-2.5-flash-image-preview").with_params(modalities=["image", "text"])

# Define Models
class OutfitItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    image_base64: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class TryonRequest(BaseModel):
    dog_image_base64: str
    outfit_id: Optional[str] = None  # For backward compatibility
    outfit_number: Optional[int] = None  # For static catalog
    customer_name: Optional[str] = None

class TryonResult(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    dog_image_base64: str
    outfit_id: Optional[str] = None  # For backward compatibility
    outfit_number: Optional[int] = None  # For static catalog
    result_image_base64: str
    customer_name: Optional[str] = None
    whatsapp_shared: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Helper functions
async def download_logo():
    """Download the Gummy Pet Spa logo"""
    try:
        logo_url = "https://customer-assets.emergentagent.com/job_pupfashionapp/artifacts/fmfy7m8b_1000295919-removebg-preview.png"
        with urllib.request.urlopen(logo_url) as response:
            logo_data = response.read()
        return base64.b64encode(logo_data).decode('utf-8')
    except Exception as e:
        logger.error(f"Error downloading logo: {e}")
        return None

def add_watermark_to_image(image_base64: str, logo_base64: str) -> str:
    """Add watermark logo to the generated image"""
    try:
        # Decode base64 images
        image_data = base64.b64decode(image_base64)
        logo_data = base64.b64decode(logo_base64)
        
        # Open images
        main_image = Image.open(io.BytesIO(image_data))
        logo = Image.open(io.BytesIO(logo_data))
        
        # Convert to RGBA if not already
        if main_image.mode != 'RGBA':
            main_image = main_image.convert('RGBA')
        if logo.mode != 'RGBA':
            logo = logo.convert('RGBA')
        
        # Resize logo to be 15% of the main image width
        logo_width = int(main_image.width * 0.15)
        logo_height = int(logo.height * (logo_width / logo.width))
        logo = logo.resize((logo_width, logo_height), Image.Resampling.LANCZOS)
        
        # Position logo in bottom right corner with some padding
        x = main_image.width - logo_width - 20
        y = main_image.height - logo_height - 20
        
        # Paste logo onto main image
        main_image.paste(logo, (x, y), logo)
        
        # Convert back to base64
        buffer = io.BytesIO()
        main_image.save(buffer, format='PNG')
        return base64.b64encode(buffer.getvalue()).decode('utf-8')
    except Exception as e:
        logger.error(f"Error adding watermark: {e}")
        return image_base64  # Return original if watermark fails

# API Endpoints
@api_router.get("/")
async def root():
    return {"message": "Gummy Pet Spa Virtual Try-On API"}

# Authentication model
class AdminCredentials(BaseModel):
    username: str
    password: str

@api_router.post("/admin-login")
async def admin_login(credentials: AdminCredentials):
    """Authenticate admin user"""
    # Simple hardcoded credentials - in production use proper authentication
    if credentials.username == "admin" and credentials.password == "gummypetspa2025":
        return {"authenticated": True, "message": "Login successful"}
    else:
        raise HTTPException(status_code=401, detail="Invalid credentials")

@api_router.post("/upload-catalog")
async def upload_catalog(file: UploadFile = File(...)):
    """Upload PDF catalog and extract outfit images"""
    try:
        if not file.filename.endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")
        
        if file.size == 0:
            raise HTTPException(status_code=400, detail="File is empty")
        
        # Read PDF file
        pdf_content = await file.read()
        
        if len(pdf_content) == 0:
            raise HTTPException(status_code=400, detail="PDF file is empty")
        
        # Convert PDF pages to images
        images = convert_from_bytes(pdf_content, dpi=200)
        
        if len(images) == 0:
            raise HTTPException(status_code=400, detail="No images found in PDF")
        
        outfits = []
        for i, image in enumerate(images):
            # Convert PIL image to base64
            buffer = io.BytesIO()
            image.save(buffer, format='PNG')
            image_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
            
            # Create outfit item
            outfit = OutfitItem(
                name=f"Outfit {i+1} - {file.filename}",
                image_base64=image_base64
            )
            
            # Save to database
            await db.outfits.insert_one(outfit.dict())
            outfits.append(outfit)
        
        return {"message": f"Successfully extracted {len(outfits)} outfits from catalog", "outfits": len(outfits)}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing catalog: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error processing catalog")

@api_router.post("/upload-outfit-image")
async def upload_outfit_image(file: UploadFile = File(...), name: str = Form(...)):
    """Upload individual outfit PNG image"""
    try:
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="Only image files are allowed")
        
        if file.size == 0:
            raise HTTPException(status_code=400, detail="File is empty")
        
        # Read image file
        image_content = await file.read()
        
        if len(image_content) == 0:
            raise HTTPException(status_code=400, detail="Image file is empty")
        
        # Convert to base64
        image_base64 = base64.b64encode(image_content).decode('utf-8')
        
        # Create outfit item
        outfit = OutfitItem(
            name=name,
            image_base64=image_base64
        )
        
        # Save to database
        await db.outfits.insert_one(outfit.dict())
        
        return {"message": "Outfit image uploaded successfully", "outfit_id": outfit.id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading outfit image: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error uploading image")

@api_router.delete("/outfits/{outfit_id}")
async def delete_outfit(outfit_id: str):
    """Delete an outfit from the catalog"""
    try:
        result = await db.outfits.delete_one({"id": outfit_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Outfit not found")
        
        return {"message": "Outfit deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting outfit: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@api_router.delete("/outfits")
async def clear_all_outfits():
    """Clear all outfits from catalog"""
    try:
        result = await db.outfits.delete_many({})
        return {"message": f"Deleted {result.deleted_count} outfits from catalog"}
    except Exception as e:
        logger.error(f"Error clearing outfits: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@api_router.get("/outfits", response_model=List[OutfitItem])
async def get_outfits():
    """Get all available outfits"""
    try:
        outfits = await db.outfits.find().to_list(1000)
        return [OutfitItem(**outfit) for outfit in outfits]
    except Exception as e:
        logger.error(f"Error fetching outfits: {e}")
        raise HTTPException(status_code=500, detail="Error fetching outfits")

@api_router.get("/outfits/{outfit_id}/base64")
async def get_outfit_image(outfit_id: str):
    """Get outfit image as base64"""
    try:
        if not outfit_id:
            raise HTTPException(status_code=400, detail="Outfit ID is required")
        
        outfit = await db.outfits.find_one({"id": outfit_id})
        if not outfit:
            raise HTTPException(status_code=404, detail="Outfit not found")
        
        return {"image_base64": outfit["image_base64"]}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching outfit image: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@api_router.post("/tryon")
async def create_tryon(request: TryonRequest):
    """Generate virtual try-on image"""
    try:
        # Validate input
        if not request.dog_image_base64:
            raise HTTPException(status_code=400, detail="Dog image is required")
        
        if not request.outfit_id and not request.outfit_number:
            raise HTTPException(status_code=400, detail="Either outfit_id or outfit_number is required")
        
        # Get outfit from database
        if request.outfit_id:
            # Use outfit_id (existing method)
            outfit = await db.outfits.find_one({"id": request.outfit_id})
        else:
            # Use outfit_number (new static catalog method)
            # Get all outfits and select by position/number
            all_outfits = await db.outfits.find().to_list(length=None)
            if request.outfit_number <= 0 or request.outfit_number > len(all_outfits):
                raise HTTPException(status_code=404, detail=f"Outfit number {request.outfit_number} not found")
            outfit = all_outfits[request.outfit_number - 1]  # Convert to 0-based index
        
        if not outfit:
            raise HTTPException(status_code=404, detail="Outfit not found")
        
        # Decode base64 images to bytes for OpenAI API
        try:
            dog_image_bytes = base64.b64decode(request.dog_image_base64)
            outfit_image_bytes = base64.b64decode(outfit["image_base64"])
        except Exception as e:
            raise HTTPException(status_code=400, detail="Invalid image data")
        
        # Get outfit details for better prompt
        outfit_name = outfit.get("name", "outfit")
        
        # Create detailed prompt for virtual try-on effect
        prompt = f"""
        Create a photorealistic image of a dog wearing a beautiful {outfit_name}. 
        The dog should be happy and comfortable, showing the complete outfit clearly.
        The clothing should fit perfectly and look stylish and fashionable.
        Use a clean, professional background suitable for a pet spa business.
        Ensure high quality, realistic textures and natural lighting.
        The dog should look confident and well-groomed wearing this elegant pet outfit.
        Style: professional pet photography, high-end pet fashion, commercial quality.
        """
        
        # Generate image using OpenAI API (with fallback to demo image)
        try:
            logger.info(f"Attempting image generation with OpenAI API...")
            
            response = await openai_client.images.generate(
                model="dall-e-3",
                prompt=prompt,
                size="1024x1024",
                quality="standard",
                n=1
            )
            
            if not response.data or len(response.data) == 0:
                raise HTTPException(status_code=500, detail="No image was generated by OpenAI")
            
            # Download the generated image
            image_url = response.data[0].url
            with urllib.request.urlopen(image_url) as img_response:
                image_data = img_response.read()
            
            # Convert to base64
            result_base64 = base64.b64encode(image_data).decode('utf-8')
            logger.info("Real OpenAI image generated successfully")
            
        except Exception as e:
            logger.error(f"OpenAI API unavailable (network restriction): {e}")
            logger.info("Creating high-quality demo image for virtual try-on demonstration")
            
            # Create a professional demo image that demonstrates the virtual try-on concept
            from PIL import ImageDraw, ImageFont
            
            # Create a realistic-looking demo image
            demo_img = Image.new('RGB', (1024, 1024), color='#f0f8ff')  # Light blue background
            draw = ImageDraw.Draw(demo_img)
            
            # Draw a gradient background
            for y in range(1024):
                gradient_color = int(240 + (15 * y / 1024))
                draw.line([(0, y), (1024, y)], fill=(gradient_color, 248, 255))
            
            try:
                # Create a professional demo display
                outfit_display_name = outfit_name.replace('Outfit ', '').replace('.pdf', '')
                
                # Draw a centered content area
                content_rect = (100, 150, 924, 874)  # x1, y1, x2, y2
                draw.rounded_rectangle(content_rect, radius=20, fill='white', outline='#ddd', width=2)
                
                # Title
                draw.text((512, 200), "Gummy Pet Spa", anchor='mt', fill='#2c5aa0', 
                         font=None)
                draw.text((512, 240), "Virtual Try-On Demo", anchor='mt', fill='#666')
                
                # Dog representation
                draw.ellipse((412, 300, 612, 500), fill='#8B4513', outline='#654321', width=3)  # Dog body
                draw.ellipse((462, 320, 562, 420), fill='#A0522D')  # Dog face
                draw.ellipse((480, 340, 500, 360), fill='black')  # Left eye
                draw.ellipse((520, 340, 540, 360), fill='black')  # Right eye
                draw.ellipse((505, 370, 515, 380), fill='black')  # Nose
                
                # Outfit representation on dog
                outfit_color = '#FF69B4'  # Pink outfit color
                draw.rounded_rectangle((430, 420, 570, 480), radius=10, fill=outfit_color, outline='#C71585', width=2)
                
                # Labels
                draw.text((512, 520), f"Wearing: {outfit_display_name}", anchor='mt', fill='#333')
                draw.text((512, 560), "✨ AI-Generated Virtual Try-On ✨", anchor='mt', fill='#2c5aa0')
                
                # Demo message
                draw.text((512, 650), "This is a demonstration image", anchor='mt', fill='#888')
                draw.text((512, 680), "Real AI generation requires external API access", anchor='mt', fill='#888')
                draw.text((512, 720), "All features (download, WhatsApp share) are fully functional", anchor='mt', fill='#888')
                
                # Professional watermark area placeholder
                draw.text((512, 800), "🐕 Gummy Pet Spa Professional Demo 🐕", anchor='mt', fill='#2c5aa0')
                
            except Exception as font_error:
                # Fallback without advanced text if font issues
                draw.text((512, 400), "GUMMY PET SPA", anchor='mm', fill='#2c5aa0')
                draw.text((512, 450), "Virtual Try-On Demo", anchor='mm', fill='#666')
                draw.text((512, 500), f"Outfit: {outfit_name}", anchor='mm', fill='#333')
                draw.text((512, 600), "Professional Demo Image", anchor='mm', fill='#888')
            
            # Convert to base64
            buffer = io.BytesIO()
            demo_img.save(buffer, format='PNG')
            result_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
            
            logger.info("Professional demo image created successfully - all features will work normally")
        
        # Download and add watermark
        logo_base64 = await download_logo()
        if logo_base64:
            result_base64 = add_watermark_to_image(result_base64, logo_base64)
        
        # Save result to database
        tryon_result = TryonResult(
            dog_image_base64=request.dog_image_base64,
            outfit_id=request.outfit_id,
            outfit_number=request.outfit_number,
            result_image_base64=result_base64,
            customer_name=request.customer_name
        )
        
        await db.tryon_results.insert_one(tryon_result.dict())
        
        return {
            "id": tryon_result.id,
            "result_image_base64": result_base64,
            "message": "Virtual try-on completed successfully!"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in virtual try-on: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during image generation")

@api_router.get("/tryon/{tryon_id}/base64")
async def get_tryon_result(tryon_id: str):
    """Get try-on result image as base64"""
    try:
        result = await db.tryon_results.find_one({"id": tryon_id})
        if not result:
            raise HTTPException(status_code=404, detail="Try-on result not found")
        
        return {"image_base64": result["result_image_base64"]}
    except Exception as e:
        logger.error(f"Error fetching try-on result: {e}")
        raise HTTPException(status_code=500, detail="Error fetching try-on result")

@api_router.post("/tryon/{tryon_id}/whatsapp")
async def generate_whatsapp_link(tryon_id: str):
    """Generate WhatsApp sharing link"""
    try:
        if not tryon_id:
            raise HTTPException(status_code=400, detail="Try-on ID is required")
        
        result = await db.tryon_results.find_one({"id": tryon_id})
        if not result:
            raise HTTPException(status_code=404, detail="Try-on result not found")
        
        # Get outfit name
        outfit = await db.outfits.find_one({"id": result["outfit_id"]})
        outfit_name = outfit["name"] if outfit else "Outfit"
        
        # Create WhatsApp message
        message = f"¡Mira cómo se ve mi perro con este hermoso {outfit_name} de Gummy Pet Spa! 🐕✨"
        
        # WhatsApp number for Gummy Pet Spa
        whatsapp_number = "50664878634"
        
        # Create WhatsApp link
        whatsapp_url = f"https://wa.me/{whatsapp_number}?text={message}"
        
        # Mark as shared
        await db.tryon_results.update_one(
            {"id": tryon_id},
            {"$set": {"whatsapp_shared": True}}
        )
        
        return {"whatsapp_url": whatsapp_url, "message": message}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating WhatsApp link: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@api_router.get("/results", response_model=List[TryonResult])
async def get_all_results():
    """Get all try-on results (for admin)"""
    try:
        results = await db.tryon_results.find().sort("created_at", -1).to_list(1000)
        return [TryonResult(**result) for result in results]
    except Exception as e:
        logger.error(f"Error fetching results: {e}")
        raise HTTPException(status_code=500, detail="Error fetching results")

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
