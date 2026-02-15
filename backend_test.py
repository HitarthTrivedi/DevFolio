import requests
import sys
import json
from datetime import datetime

class DevFolioAPITester:
    def __init__(self, base_url="https://maker-profile-2.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.project_id = None
        self.achievement_id = None
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test_name": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            test_headers.update(headers)

        try:
            print(f"\n🔍 Testing {name}...")
            print(f"   URL: {url}")
            
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            details = f"Expected {expected_status}, got {response.status_code}"
            
            if not success:
                try:
                    error_data = response.json()
                    details += f" - {error_data}"
                except:
                    details += f" - {response.text[:100]}"
            
            self.log_test(name, success, details if not success else "")
            
            return success, response.json() if success and response.text else {}

        except requests.RequestException as e:
            self.log_test(name, False, f"Request failed: {str(e)}")
            return False, {}
        except Exception as e:
            self.log_test(name, False, f"Unexpected error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test API health endpoints"""
        print("\n" + "="*50)
        print("TESTING HEALTH ENDPOINTS")
        print("="*50)
        
        success1, _ = self.run_test(
            "Health Check Root",
            "GET",
            "/",
            200
        )
        
        success2, _ = self.run_test(
            "Health Check",
            "GET",
            "/health",
            200
        )
        
        return success1 and success2

    def test_user_registration(self):
        """Test user registration"""
        print("\n" + "="*50)
        print("TESTING USER REGISTRATION")
        print("="*50)
        
        # Generate unique email for testing
        timestamp = datetime.now().strftime('%H%M%S')
        test_user = {
            "name": f"Test User {timestamp}",
            "email": f"testuser{timestamp}@example.com", 
            "password": "testpass123"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "/auth/register",
            200,
            test_user
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_data = response['user']
            print(f"   ✅ Token received: {self.token[:20]}...")
            print(f"   ✅ User slug: {self.user_data.get('unique_slug')}")
        
        return success

    def test_user_login(self):
        """Test user login with existing credentials"""
        print("\n" + "="*50)
        print("TESTING USER LOGIN")
        print("="*50)
        
        # Test with invalid credentials first
        success1, _ = self.run_test(
            "Login with Invalid Credentials",
            "POST",
            "/auth/login",
            401,
            {"email": "nonexistent@example.com", "password": "wrongpass"}
        )
        
        # Test login with valid credentials (if we have user data from registration)
        if self.user_data:
            login_data = {
                "email": self.user_data['email'],
                "password": "testpass123"  # From registration
            }
            
            success2, response = self.run_test(
                "Login with Valid Credentials", 
                "POST",
                "/auth/login",
                200,
                login_data
            )
            
            return success1 and success2
        
        return success1

    def test_auth_me(self):
        """Test getting current user info"""
        print("\n" + "="*50)
        print("TESTING AUTH ME ENDPOINT")
        print("="*50)
        
        success, response = self.run_test(
            "Get Current User",
            "GET", 
            "/auth/me",
            200
        )
        
        if success and response:
            print(f"   ✅ User name: {response.get('name')}")
            print(f"   ✅ User email: {response.get('email')}")
        
        return success

    def test_projects_crud(self):
        """Test complete project CRUD operations"""
        print("\n" + "="*50)
        print("TESTING PROJECTS CRUD")
        print("="*50)
        
        # Create project
        project_data = {
            "title": "Test Project",
            "description": "A test project for API testing",
            "readme_content": "# Test Project\nThis is a test project.",
            "tech_stack": ["Python", "FastAPI", "MongoDB"],
            "github_link": "https://github.com/test/project",
            "live_demo_link": "https://demo.test.com"
        }
        
        success1, response = self.run_test(
            "Create Project",
            "POST",
            "/projects",
            200,
            project_data
        )
        
        if success1 and 'id' in response:
            self.project_id = response['id']
            print(f"   ✅ Project created with ID: {self.project_id}")
        
        # Get all projects
        success2, response = self.run_test(
            "Get All Projects",
            "GET",
            "/projects",
            200
        )
        
        if success2:
            print(f"   ✅ Found {len(response)} projects")
        
        # Get specific project
        success3 = True
        if self.project_id:
            success3, _ = self.run_test(
                "Get Specific Project",
                "GET",
                f"/projects/{self.project_id}",
                200
            )
        
        # Update project
        success4 = True
        if self.project_id:
            update_data = {
                "title": "Updated Test Project",
                "description": "Updated description"
            }
            success4, _ = self.run_test(
                "Update Project",
                "PUT",
                f"/projects/{self.project_id}",
                200,
                update_data
            )
        
        return success1 and success2 and success3 and success4

    def test_achievements_crud(self):
        """Test complete achievement CRUD operations"""
        print("\n" + "="*50)
        print("TESTING ACHIEVEMENTS CRUD")
        print("="*50)
        
        # Create achievement
        achievement_data = {
            "title": "Test Achievement",
            "description": "A test achievement for API testing",
            "date": "2024-01-15",
            "certificate_link": "https://certificate.test.com"
        }
        
        success1, response = self.run_test(
            "Create Achievement",
            "POST",
            "/achievements",
            200,
            achievement_data
        )
        
        if success1 and 'id' in response:
            self.achievement_id = response['id']
            print(f"   ✅ Achievement created with ID: {self.achievement_id}")
        
        # Get all achievements
        success2, response = self.run_test(
            "Get All Achievements",
            "GET",
            "/achievements",
            200
        )
        
        if success2:
            print(f"   ✅ Found {len(response)} achievements")
        
        # Get specific achievement
        success3 = True
        if self.achievement_id:
            success3, _ = self.run_test(
                "Get Specific Achievement",
                "GET",
                f"/achievements/{self.achievement_id}",
                200
            )
        
        # Update achievement
        success4 = True
        if self.achievement_id:
            update_data = {
                "title": "Updated Test Achievement",
                "description": "Updated description"
            }
            success4, _ = self.run_test(
                "Update Achievement",
                "PUT",
                f"/achievements/{self.achievement_id}",
                200,
                update_data
            )
        
        return success1 and success2 and success3 and success4

    def test_public_profile(self):
        """Test public profile endpoint"""
        print("\n" + "="*50)
        print("TESTING PUBLIC PROFILE")
        print("="*50)
        
        if not self.user_data or 'unique_slug' not in self.user_data:
            self.log_test("Public Profile", False, "No user slug available")
            return False
        
        slug = self.user_data['unique_slug']
        
        # Test public profile with all sections
        success1, response = self.run_test(
            "Public Profile - All Sections",
            "GET",
            f"/profile/{slug}?sections=all",
            200
        )
        
        if success1:
            print(f"   ✅ Profile name: {response.get('name')}")
            print(f"   ✅ Projects count: {len(response.get('projects', []))}")
            print(f"   ✅ Achievements count: {len(response.get('achievements', []))}")
        
        # Test with projects only
        success2, _ = self.run_test(
            "Public Profile - Projects Only", 
            "GET",
            f"/profile/{slug}?sections=projects",
            200
        )
        
        # Test with achievements only
        success3, _ = self.run_test(
            "Public Profile - Achievements Only",
            "GET",
            f"/profile/{slug}?sections=achievements", 
            200
        )
        
        return success1 and success2 and success3

    def test_ai_export(self):
        """Test AI export endpoint"""
        print("\n" + "="*50)
        print("TESTING AI EXPORT ENDPOINT")
        print("="*50)
        
        if not self.user_data or 'unique_slug' not in self.user_data:
            self.log_test("AI Export", False, "No user slug available")
            return False
        
        slug = self.user_data['unique_slug']
        
        # Test AI export with all sections
        success1, response = self.run_test(
            "AI Export - All Sections",
            "GET",
            f"/export/{slug}?sections=all",
            200
        )
        
        if success1:
            print(f"   ✅ User data: {response.get('user', {}).get('name')}")
            print(f"   ✅ Metadata: {response.get('metadata', {})}")
            projects = response.get('projects', [])
            achievements = response.get('achievements', [])
            print(f"   ✅ Projects in export: {len(projects)}")
            print(f"   ✅ Achievements in export: {len(achievements)}")
        
        # Test with projects only
        success2, _ = self.run_test(
            "AI Export - Projects Only",
            "GET",
            f"/export/{slug}?sections=projects",
            200
        )
        
        # Test with achievements only  
        success3, _ = self.run_test(
            "AI Export - Achievements Only",
            "GET",
            f"/export/{slug}?sections=achievements",
            200
        )
        
        # Test with invalid slug
        success4, _ = self.run_test(
            "AI Export - Invalid Slug",
            "GET",
            "/export/nonexistent-slug",
            404
        )
        
        return success1 and success2 and success3 and success4

    def test_delete_operations(self):
        """Test delete operations (cleanup)"""
        print("\n" + "="*50)
        print("TESTING DELETE OPERATIONS")
        print("="*50)
        
        success1 = True
        success2 = True
        
        # Delete project
        if self.project_id:
            success1, _ = self.run_test(
                "Delete Project",
                "DELETE",
                f"/projects/{self.project_id}",
                200
            )
        
        # Delete achievement
        if self.achievement_id:
            success2, _ = self.run_test(
                "Delete Achievement", 
                "DELETE",
                f"/achievements/{self.achievement_id}",
                200
            )
        
        return success1 and success2

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting DevFolio API Tests")
        print("="*60)
        
        # Run tests in sequence
        health_success = self.test_health_check()
        
        if not health_success:
            print("\n❌ Health check failed. Stopping tests.")
            return self.get_results()
        
        reg_success = self.test_user_registration()
        login_success = self.test_user_login()
        me_success = self.test_auth_me()
        projects_success = self.test_projects_crud()
        achievements_success = self.test_achievements_crud()
        profile_success = self.test_public_profile()
        export_success = self.test_ai_export()
        delete_success = self.test_delete_operations()
        
        return self.get_results()

    def get_results(self):
        """Get test results summary"""
        print("\n" + "="*60)
        print("TEST RESULTS SUMMARY")
        print("="*60)
        print(f"Tests passed: {self.tests_passed}/{self.tests_run}")
        print(f"Success rate: {(self.tests_passed/self.tests_run)*100:.1f}%" if self.tests_run > 0 else "No tests run")
        
        # List failed tests
        failed_tests = [test for test in self.test_results if not test['success']]
        if failed_tests:
            print("\n❌ Failed Tests:")
            for test in failed_tests:
                print(f"  - {test['test_name']}: {test['details']}")
        else:
            print("\n✅ All tests passed!")
        
        return {
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "success_rate": (self.tests_passed/self.tests_run)*100 if self.tests_run > 0 else 0,
            "failed_tests": failed_tests,
            "test_results": self.test_results
        }

def main():
    tester = DevFolioAPITester()
    results = tester.run_all_tests()
    
    # Return exit code based on success
    return 0 if results['success_rate'] == 100 else 1

if __name__ == "__main__":
    sys.exit(main())