#!/usr/bin/env python3

import asyncio
import os
import sys
from pathlib import Path

# Add backend to path
sys.path.append('/app/backend')

# Load environment variables
from dotenv import load_dotenv
load_dotenv('/app/backend/.env')

import openai

async def test_openai_config():
    """Test OpenAI configuration with different endpoints"""
    
    print("🔧 Testing OpenAI Configuration")
    print("=" * 50)
    
    # Get configuration
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    
    print(f"API Key: {api_key[:10]}...{api_key[-4:] if api_key else 'None'}")
    
    # Test endpoints to try
    endpoints = [
        ("Emergent Proxy", "https://api.emergent.rest"),
        ("Standard OpenAI", "https://api.openai.com/v1"),
        ("Alternative Emergent", "https://emergent.rest/api"),
        ("Alternative Emergent v1", "https://api.emergent.rest/v1")
    ]
    
    for endpoint_name, base_url in endpoints:
        print(f"\n🔄 Testing {endpoint_name}: {base_url}")
        
        # Initialize client
        try:
            client = openai.AsyncOpenAI(
                api_key=api_key,
                base_url=base_url
            )
            print("✅ OpenAI client initialized successfully")
        except Exception as e:
            print(f"❌ Failed to initialize OpenAI client: {e}")
            continue
        
        # Test basic connectivity with a simple chat completion
        print("   🔄 Testing chat completion...")
        try:
            response = await client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": "Hello, just testing connectivity. Please respond with 'OK'."}],
                max_tokens=10,
                timeout=10
            )
            print("   ✅ Chat completion successful")
            print(f"   Response: {response.choices[0].message.content}")
            
            # If chat works, test image generation
            print("   🔄 Testing image generation...")
            try:
                response = await client.images.generate(
                    model="dall-e-3",
                    prompt="A simple test image of a blue circle",
                    size="1024x1024",
                    quality="standard",
                    n=1,
                    timeout=30
                )
                print("   ✅ Image generation successful")
                print(f"   Image URL: {response.data[0].url}")
                print(f"\n🎉 SUCCESS: {endpoint_name} endpoint is working!")
                return True, base_url
            except Exception as e:
                print(f"   ❌ Image generation failed: {e}")
                print(f"   Error type: {type(e).__name__}")
                
        except Exception as e:
            print(f"   ❌ Chat completion failed: {e}")
            print(f"   Error type: {type(e).__name__}")
    
    print(f"\n❌ All endpoints failed")
    return False, None

if __name__ == "__main__":
    success = asyncio.run(test_openai_config())
    sys.exit(0 if success else 1)