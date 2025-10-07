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
    """Test OpenAI configuration with Emergent endpoint"""
    
    print("🔧 Testing OpenAI Configuration")
    print("=" * 50)
    
    # Get configuration
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    base_url = "https://api.emergent.rest"
    
    print(f"API Key: {api_key[:10]}...{api_key[-4:] if api_key else 'None'}")
    print(f"Base URL: {base_url}")
    
    # Initialize client
    try:
        client = openai.AsyncOpenAI(
            api_key=api_key,
            base_url=base_url
        )
        print("✅ OpenAI client initialized successfully")
    except Exception as e:
        print(f"❌ Failed to initialize OpenAI client: {e}")
        return False
    
    # Test basic connectivity with a simple chat completion
    print("\n🔄 Testing basic connectivity with chat completion...")
    try:
        response = await client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": "Hello, just testing connectivity. Please respond with 'OK'."}],
            max_tokens=10
        )
        print("✅ Chat completion successful")
        print(f"Response: {response.choices[0].message.content}")
    except Exception as e:
        print(f"❌ Chat completion failed: {e}")
        print(f"Error type: {type(e).__name__}")
        return False
    
    # Test image generation
    print("\n🔄 Testing image generation...")
    try:
        response = await client.images.generate(
            model="dall-e-3",
            prompt="A simple test image of a blue circle",
            size="1024x1024",
            quality="standard",
            n=1
        )
        print("✅ Image generation successful")
        print(f"Image URL: {response.data[0].url}")
        return True
    except Exception as e:
        print(f"❌ Image generation failed: {e}")
        print(f"Error type: {type(e).__name__}")
        return False

if __name__ == "__main__":
    success = asyncio.run(test_openai_config())
    sys.exit(0 if success else 1)