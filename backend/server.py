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
from emergentintegrations.llm.openai.image_generation import OpenAIImageGeneration
import urllib.request

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

# Initialize OpenAI Image Generation
image_gen = OpenAIImageGeneration(api_key=os.environ.get('EMERGENT_LLM_KEY'))

# Define Models
class OutfitItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    image_base64: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class TryonRequest(BaseModel):
    dog_image_base64: str
    outfit_id: str
    customer_name: Optional[str] = None

class TryonResult(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    dog_image_base64: str
    outfit_id: str
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
        # Get outfit from database
        outfit = await db.outfits.find_one({"id": request.outfit_id})
        if not outfit:
            raise HTTPException(status_code=404, detail="Outfit not found")
        
        # Decode base64 images to bytes for OpenAI API
        dog_image_bytes = base64.b64decode(request.dog_image_base64)
        outfit_image_bytes = base64.b64decode(outfit["image_base64"])
        
        # Create prompt for virtual try-on
        prompt = f"""
        Create a photorealistic image of a dog wearing the outfit from the reference image. 
        The dog should look natural and happy wearing the clothing. 
        Ensure the outfit fits properly on the dog's body and maintains the style and colors from the reference.
        The background should remain similar to the original dog photo.
        Make it look professional and appealing for a pet spa business.
        """
        
        # Generate image using OpenAI Image Edit
        result_images = await image_gen.edit_images(
            image=[dog_image_bytes, outfit_image_bytes],
            prompt=prompt,
            model="gpt-image-1",
            size="1024x1536",
            quality="high"
        )
        
        if not result_images or len(result_images) == 0:
            raise HTTPException(status_code=500, detail="No image was generated")
        
        # Convert result to base64
        result_base64 = base64.b64encode(result_images[0]).decode('utf-8')
        
        # Download and add watermark
        logo_base64 = await download_logo()
        if logo_base64:
            result_base64 = add_watermark_to_image(result_base64, logo_base64)
        
        # Save result to database
        tryon_result = TryonResult(
            dog_image_base64=request.dog_image_base64,
            outfit_id=request.outfit_id,
            result_image_base64=result_base64,
            customer_name=request.customer_name
        )
        
        await db.tryon_results.insert_one(tryon_result.dict())
        
        return {
            "id": tryon_result.id,
            "result_image_base64": result_base64,
            "message": "Virtual try-on completed successfully!"
        }
        
    except Exception as e:
        logger.error(f"Error in virtual try-on: {e}")
        raise HTTPException(status_code=500, detail=f"Error generating try-on: {str(e)}")

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
        
    except Exception as e:
        logger.error(f"Error generating WhatsApp link: {e}")
        raise HTTPException(status_code=500, detail="Error generating WhatsApp link")

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
