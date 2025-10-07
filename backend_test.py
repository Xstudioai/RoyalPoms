import requests
import sys
import base64
import io
from datetime import datetime
from PIL import Image
import json

class VirtualTryOnAPITester:
    def __init__(self, base_url="https://pupfashionapp.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            status = "✅ PASSED"
        else:
            status = "❌ FAILED"
        
        result = {
            "test": name,
            "status": status,
            "success": success,
            "details": details
        }
        self.test_results.append(result)
        print(f"{status} - {name}")
        if details:
            print(f"   Details: {details}")

    def create_test_image_base64(self):
        """Create a simple test image and return as base64"""
        try:
            # Create a simple 200x200 test image
            img = Image.new('RGB', (200, 200), color='blue')
            buffer = io.BytesIO()
            img.save(buffer, format='PNG')
            return base64.b64encode(buffer.getvalue()).decode('utf-8')
        except Exception as e:
            return None

    def test_root_endpoint(self):
        """Test GET /api/"""
        try:
            response = requests.get(f"{self.api_url}/", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Message: {data.get('message', 'No message')}"
            self.log_test("Root API Endpoint", success, details)
            return success
        except Exception as e:
            self.log_test("Root API Endpoint", False, f"Error: {str(e)}")
            return False

    def test_get_outfits_empty(self):
        """Test GET /api/outfits (should be empty initially)"""
        try:
            response = requests.get(f"{self.api_url}/outfits", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                outfits = response.json()
                details += f", Outfits count: {len(outfits)}"
            self.log_test("Get Outfits (Empty)", success, details)
            return success, response.json() if success else []
        except Exception as e:
            self.log_test("Get Outfits (Empty)", False, f"Error: {str(e)}")
            return False, []

    def test_upload_catalog_invalid_file(self):
        """Test POST /api/upload-catalog with invalid file"""
        try:
            # Create a fake text file instead of PDF
            files = {'file': ('test.txt', 'This is not a PDF', 'text/plain')}
            response = requests.post(f"{self.api_url}/upload-catalog", files=files, timeout=30)
            success = response.status_code == 400  # Should fail with 400
            details = f"Status: {response.status_code}"
            if response.status_code == 400:
                details += " (Correctly rejected non-PDF file)"
            self.log_test("Upload Invalid File", success, details)
            return success
        except Exception as e:
            self.log_test("Upload Invalid File", False, f"Error: {str(e)}")
            return False

    def test_tryon_without_outfit(self):
        """Test POST /api/tryon with non-existent outfit"""
        try:
            test_image = self.create_test_image_base64()
            if not test_image:
                self.log_test("Try-on Without Outfit", False, "Could not create test image")
                return False

            payload = {
                "dog_image_base64": test_image,
                "outfit_id": "non-existent-id",
                "customer_name": "Test Customer"
            }
            
            response = requests.post(f"{self.api_url}/tryon", json=payload, timeout=30)
            success = response.status_code == 404  # Should fail with 404
            details = f"Status: {response.status_code}"
            if response.status_code == 404:
                details += " (Correctly rejected non-existent outfit)"
            self.log_test("Try-on Without Outfit", success, details)
            return success
        except Exception as e:
            self.log_test("Try-on Without Outfit", False, f"Error: {str(e)}")
            return False

    def test_whatsapp_link_invalid_id(self):
        """Test POST /api/tryon/{id}/whatsapp with invalid ID"""
        try:
            response = requests.post(f"{self.api_url}/tryon/invalid-id/whatsapp", timeout=10)
            success = response.status_code == 404  # Should fail with 404
            details = f"Status: {response.status_code}"
            if response.status_code == 404:
                details += " (Correctly rejected invalid try-on ID)"
            self.log_test("WhatsApp Link Invalid ID", success, details)
            return success
        except Exception as e:
            self.log_test("WhatsApp Link Invalid ID", False, f"Error: {str(e)}")
            return False

    def test_get_results(self):
        """Test GET /api/results"""
        try:
            response = requests.get(f"{self.api_url}/results", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                results = response.json()
                details += f", Results count: {len(results)}"
            self.log_test("Get All Results", success, details)
            return success
        except Exception as e:
            self.log_test("Get All Results", False, f"Error: {str(e)}")
            return False

    def test_cors_headers(self):
        """Test CORS headers are present"""
        try:
            response = requests.options(f"{self.api_url}/", timeout=10)
            cors_headers = [
                'access-control-allow-origin',
                'access-control-allow-methods',
                'access-control-allow-headers'
            ]
            
            present_headers = []
            for header in cors_headers:
                if header in [h.lower() for h in response.headers.keys()]:
                    present_headers.append(header)
            
            success = len(present_headers) >= 1  # At least one CORS header should be present
            details = f"CORS headers found: {present_headers}"
            self.log_test("CORS Headers", success, details)
            return success
        except Exception as e:
            self.log_test("CORS Headers", False, f"Error: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all backend API tests"""
        print("🚀 Starting Virtual Try-On API Tests...")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)

        # Test basic connectivity and endpoints
        self.test_root_endpoint()
        self.test_get_outfits_empty()
        self.test_get_results()
        
        # Test error handling
        self.test_upload_catalog_invalid_file()
        self.test_tryon_without_outfit()
        self.test_whatsapp_link_invalid_id()
        
        # Test CORS
        self.test_cors_headers()

        # Print summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {success_rate:.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("\n🎉 All tests passed! Backend API is working correctly.")
            return True
        else:
            print(f"\n⚠️  {self.tests_run - self.tests_passed} test(s) failed. Check the details above.")
            return False

def main():
    tester = VirtualTryOnAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump({
            'timestamp': datetime.now().isoformat(),
            'total_tests': tester.tests_run,
            'passed_tests': tester.tests_passed,
            'success_rate': (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0,
            'results': tester.test_results
        }, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())