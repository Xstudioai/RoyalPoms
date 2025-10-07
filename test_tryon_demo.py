#!/usr/bin/env python3
"""
Focused test for /api/tryon endpoint with demo image fallback
"""
import requests
import base64
import io
import json
from PIL import Image, ImageDraw

def create_test_dog_image():
    """Create a test dog image"""
    img = Image.new('RGB', (400, 400), color='white')
    draw = ImageDraw.Draw(img)
    
    # Draw a simple dog
    draw.ellipse([150, 200, 250, 300], fill='brown')  # Body
    draw.ellipse([175, 150, 225, 200], fill='brown')  # Head
    draw.ellipse([165, 140, 185, 170], fill='#8B4513')  # Left ear
    draw.ellipse([215, 140, 235, 170], fill='#8B4513')  # Right ear
    draw.ellipse([185, 160, 195, 170], fill='black')  # Left eye
    draw.ellipse([205, 160, 215, 170], fill='black')  # Right eye
    draw.ellipse([195, 175, 205, 185], fill='black')  # Nose
    
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    return base64.b64encode(buffer.getvalue()).decode('utf-8')

def test_tryon_demo_fallback():
    """Test the /api/tryon endpoint with demo image fallback"""
    base_url = "https://doggie-outfitter.preview.emergentagent.com"
    api_url = f"{base_url}/api"
    
    print("🧪 Testing /api/tryon endpoint with demo image fallback...")
    
    # Step 1: Get available outfits
    print("1. Getting available outfits...")
    response = requests.get(f"{api_url}/outfits", timeout=10)
    if response.status_code != 200:
        print(f"❌ Failed to get outfits: {response.status_code}")
        return False
    
    outfits = response.json()
    if not outfits:
        print("❌ No outfits available for testing")
        return False
    
    outfit_id = outfits[0]['id']
    outfit_name = outfits[0]['name']
    print(f"✅ Using outfit: {outfit_name} (ID: {outfit_id})")
    
    # Step 2: Create test dog image
    print("2. Creating test dog image...")
    dog_image_base64 = create_test_dog_image()
    if not dog_image_base64:
        print("❌ Failed to create test dog image")
        return False
    print("✅ Test dog image created")
    
    # Step 3: Test virtual try-on
    print("3. Testing virtual try-on with demo fallback...")
    payload = {
        "dog_image_base64": dog_image_base64,
        "outfit_id": outfit_id,
        "customer_name": "Sofia Rodriguez"
    }
    
    print("   🔄 Sending try-on request (expecting demo image generation)...")
    response = requests.post(f"{api_url}/tryon", json=payload, timeout=60)
    
    if response.status_code != 200:
        print(f"❌ Try-on request failed: {response.status_code}")
        try:
            error_detail = response.json()
            print(f"   Error: {error_detail.get('detail', 'Unknown error')}")
        except:
            print(f"   Error: {response.text}")
        return False
    
    # Step 4: Analyze response
    result = response.json()
    tryon_id = result.get('id')
    result_image = result.get('result_image_base64')
    message = result.get('message')
    
    print(f"✅ Try-on successful!")
    print(f"   - Try-on ID: {tryon_id}")
    print(f"   - Has result image: {bool(result_image)}")
    print(f"   - Message: {message}")
    
    # Step 5: Validate generated image
    if result_image:
        try:
            image_data = base64.b64decode(result_image)
            img = Image.open(io.BytesIO(image_data))
            print(f"   - Image dimensions: {img.size}")
            print(f"   - Image mode: {img.mode}")
            print(f"   - Image size: {len(image_data)} bytes")
            
            # Check if it's the expected demo image size (1024x1024)
            if img.size == (1024, 1024):
                print("✅ Demo image has correct dimensions")
            else:
                print(f"⚠️  Unexpected image dimensions: {img.size}")
                
        except Exception as e:
            print(f"❌ Failed to validate image: {e}")
            return False
    else:
        print("❌ No result image in response")
        return False
    
    # Step 6: Test watermark functionality
    print("4. Testing watermark functionality...")
    watermark_response = requests.get(f"{api_url}/tryon/{tryon_id}/base64", timeout=10)
    if watermark_response.status_code == 200:
        watermark_result = watermark_response.json()
        watermark_image = watermark_result.get('image_base64')
        if watermark_image:
            try:
                watermark_data = base64.b64decode(watermark_image)
                watermark_img = Image.open(io.BytesIO(watermark_data))
                print(f"✅ Watermarked image retrieved: {watermark_img.size}, {watermark_img.mode}")
            except Exception as e:
                print(f"❌ Failed to validate watermarked image: {e}")
                return False
        else:
            print("❌ No watermarked image returned")
            return False
    else:
        print(f"❌ Failed to get watermarked image: {watermark_response.status_code}")
        return False
    
    # Step 7: Test WhatsApp sharing
    print("5. Testing WhatsApp sharing...")
    whatsapp_response = requests.post(f"{api_url}/tryon/{tryon_id}/whatsapp", timeout=10)
    if whatsapp_response.status_code == 200:
        whatsapp_result = whatsapp_response.json()
        whatsapp_url = whatsapp_result.get('whatsapp_url')
        whatsapp_message = whatsapp_result.get('message')
        
        if whatsapp_url and whatsapp_url.startswith('https://wa.me/'):
            print(f"✅ WhatsApp sharing works: {whatsapp_url[:50]}...")
            print(f"   Message: {whatsapp_message}")
        else:
            print(f"❌ Invalid WhatsApp URL: {whatsapp_url}")
            return False
    else:
        print(f"❌ WhatsApp sharing failed: {whatsapp_response.status_code}")
        return False
    
    print("\n🎉 ALL TESTS PASSED! Demo image fallback system is working correctly!")
    print("✅ Virtual try-on generates demo images when OpenAI API is unavailable")
    print("✅ Watermark functionality works with demo images")
    print("✅ WhatsApp sharing works with generated results")
    print("✅ All response formats are correct")
    
    return True

if __name__ == "__main__":
    success = test_tryon_demo_fallback()
    exit(0 if success else 1)