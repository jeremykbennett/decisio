import requests
import sys
import json
from datetime import datetime

class MarketingCampaignAPITester:
    def __init__(self, base_url="https://choice-maker-43.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.client_manager_token = None
        self.marketer_token = None
        self.client_manager_user = None
        self.marketer_user = None
        self.test_client_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
            self.failed_tests.append(f"{name}: {details}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        default_headers = {'Content-Type': 'application/json'}
        if headers:
            default_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=default_headers, params=data)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=default_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=default_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=default_headers)

            success = response.status_code == expected_status
            if success:
                self.log_test(name, True)
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                self.log_test(name, False, f"Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json().get('detail', 'Unknown error')
                    print(f"   Error details: {error_detail}")
                except:
                    print(f"   Response: {response.text}")
                return False, {}

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return False, {}

    def get_auth_headers(self, token):
        """Get authorization headers"""
        return {'Authorization': f'Bearer {token}'}

    def test_health_check(self):
        """Test API health check"""
        print("\n🔍 Testing API Health Check...")
        success, response = self.run_test(
            "API Health Check",
            "GET",
            "",
            200
        )
        return success

    def test_user_registration(self):
        """Test user registration for both roles"""
        print("\n🔍 Testing User Registration...")
        
        timestamp = datetime.now().strftime('%H%M%S')
        
        # Register Client Manager
        client_manager_data = {
            "email": f"client_manager_{timestamp}@test.com",
            "password": "TestPass123!",
            "full_name": "Test Client Manager",
            "role": "client_manager"
        }
        
        success, response = self.run_test(
            "Register Client Manager",
            "POST",
            "auth/register",
            200,
            data=client_manager_data
        )
        
        if success:
            self.client_manager_token = response.get('access_token')
            self.client_manager_user = response.get('user')
        
        # Register Marketer
        marketer_data = {
            "email": f"marketer_{timestamp}@test.com",
            "password": "TestPass123!",
            "full_name": "Test Marketer",
            "role": "marketer"
        }
        
        success, response = self.run_test(
            "Register Marketer",
            "POST",
            "auth/register",
            200,
            data=marketer_data
        )
        
        if success:
            self.marketer_token = response.get('access_token')
            self.marketer_user = response.get('user')
        
        return self.client_manager_token and self.marketer_token

    def test_user_login(self):
        """Test user login"""
        print("\n🔍 Testing User Login...")
        
        if not self.client_manager_user:
            return False
            
        login_data = {
            "email": self.client_manager_user['email'],
            "password": "TestPass123!"
        }
        
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        return success

    def test_get_current_user(self):
        """Test get current user endpoint"""
        print("\n🔍 Testing Get Current User...")
        
        if not self.client_manager_token:
            return False
            
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200,
            headers=self.get_auth_headers(self.client_manager_token)
        )
        
        return success

    def test_user_search(self):
        """Test user search functionality"""
        print("\n🔍 Testing User Search...")
        
        if not self.client_manager_token:
            return False
            
        success, response = self.run_test(
            "Search Users",
            "GET",
            "users/search",
            200,
            data={"q": "Test"},
            headers=self.get_auth_headers(self.client_manager_token)
        )
        
        return success

    def test_client_creation(self):
        """Test client creation by client manager"""
        print("\n🔍 Testing Client Creation...")
        
        if not self.client_manager_token or not self.client_manager_user:
            return False
            
        client_data = {
            "policy_id": f"POL-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "client_name": "Test Client Company",
            "platform": "Facebook",
            "account_type": "Enterprise",
            "plan": "Professional",
            "client_status": "Active",
            "client_managers": [self.client_manager_user['id']],
            "engagement_solutions_client": "Yes",
            "global_status_email": "Approved",
            "global_status_direct_mail": "Pending",
            "global_status_phone": "Approved",
            "global_status_direct_sms": "Declined"
        }
        
        success, response = self.run_test(
            "Create Client (Client Manager)",
            "POST",
            "clients",
            200,
            data=client_data,
            headers=self.get_auth_headers(self.client_manager_token)
        )
        
        if success:
            self.test_client_id = response.get('id')
        
        return success

    def test_marketer_cannot_create_client(self):
        """Test that marketers cannot create clients"""
        print("\n🔍 Testing Marketer Cannot Create Client...")
        
        if not self.marketer_token:
            return False
            
        client_data = {
            "policy_id": "POL-SHOULD-FAIL",
            "client_name": "Should Fail Client",
            "platform": "Facebook",
            "account_type": "Enterprise",
            "plan": "Professional",
            "client_status": "Active",
            "client_managers": [],
            "engagement_solutions_client": "Yes",
            "global_status_email": "Approved",
            "global_status_direct_mail": "Pending",
            "global_status_phone": "Approved",
            "global_status_direct_sms": "Declined"
        }
        
        success, response = self.run_test(
            "Marketer Cannot Create Client (403 Expected)",
            "POST",
            "clients",
            403,
            data=client_data,
            headers=self.get_auth_headers(self.marketer_token)
        )
        
        return success

    def test_list_clients(self):
        """Test listing clients for both roles"""
        print("\n🔍 Testing List Clients...")
        
        # Client Manager should see all clients
        if self.client_manager_token:
            success, response = self.run_test(
                "List Clients (Client Manager)",
                "GET",
                "clients",
                200,
                headers=self.get_auth_headers(self.client_manager_token)
            )
        
        # Marketer should only see assigned clients
        if self.marketer_token:
            success, response = self.run_test(
                "List Clients (Marketer)",
                "GET",
                "clients",
                200,
                headers=self.get_auth_headers(self.marketer_token)
            )
        
        return True

    def test_client_search(self):
        """Test client search functionality"""
        print("\n🔍 Testing Client Search...")
        
        if not self.client_manager_token:
            return False
            
        success, response = self.run_test(
            "Search Clients by Name",
            "GET",
            "clients",
            200,
            data={"search": "Test Client"},
            headers=self.get_auth_headers(self.client_manager_token)
        )
        
        return success

    def test_get_client_detail(self):
        """Test getting client details"""
        print("\n🔍 Testing Get Client Detail...")
        
        if not self.client_manager_token or not self.test_client_id:
            return False
            
        success, response = self.run_test(
            "Get Client Detail",
            "GET",
            f"clients/{self.test_client_id}",
            200,
            headers=self.get_auth_headers(self.client_manager_token)
        )
        
        return success

    def test_update_client(self):
        """Test updating client"""
        print("\n🔍 Testing Update Client...")
        
        if not self.client_manager_token or not self.test_client_id:
            return False
            
        update_data = {
            "client_name": "Updated Test Client Company",
            "client_status": "Pending"
        }
        
        success, response = self.run_test(
            "Update Client (Client Manager)",
            "PUT",
            f"clients/{self.test_client_id}",
            200,
            data=update_data,
            headers=self.get_auth_headers(self.client_manager_token)
        )
        
        return success

    def test_marketer_cannot_update_client(self):
        """Test that marketers cannot update clients"""
        print("\n🔍 Testing Marketer Cannot Update Client...")
        
        if not self.marketer_token or not self.test_client_id:
            return False
            
        update_data = {
            "client_name": "Should Fail Update"
        }
        
        success, response = self.run_test(
            "Marketer Cannot Update Client (403 Expected)",
            "PUT",
            f"clients/{self.test_client_id}",
            403,
            data=update_data,
            headers=self.get_auth_headers(self.marketer_token)
        )
        
        return success

    def test_delete_client(self):
        """Test deleting client"""
        print("\n🔍 Testing Delete Client...")
        
        if not self.client_manager_token or not self.test_client_id:
            return False
            
        success, response = self.run_test(
            "Delete Client (Client Manager)",
            "DELETE",
            f"clients/{self.test_client_id}",
            200,
            headers=self.get_auth_headers(self.client_manager_token)
        )
        
        return success

    def test_marketer_cannot_delete_client(self):
        """Test that marketers cannot delete clients"""
        print("\n🔍 Testing Marketer Cannot Delete Client...")
        
        if not self.marketer_token:
            return False
            
        # Create a dummy client ID for this test
        dummy_id = "dummy-client-id"
        
        success, response = self.run_test(
            "Marketer Cannot Delete Client (403 Expected)",
            "DELETE",
            f"clients/{dummy_id}",
            403,
            headers=self.get_auth_headers(self.marketer_token)
        )
        
        return success

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting Marketing Campaign Decision Tracking API Tests")
        print("=" * 60)
        
        # Test sequence
        tests = [
            self.test_health_check,
            self.test_user_registration,
            self.test_user_login,
            self.test_get_current_user,
            self.test_user_search,
            self.test_client_creation,
            self.test_marketer_cannot_create_client,
            self.test_list_clients,
            self.test_client_search,
            self.test_get_client_detail,
            self.test_update_client,
            self.test_marketer_cannot_update_client,
            self.test_marketer_cannot_delete_client,
            self.test_delete_client,
        ]
        
        for test in tests:
            try:
                test()
            except Exception as e:
                print(f"❌ {test.__name__} failed with exception: {str(e)}")
                self.failed_tests.append(f"{test.__name__}: Exception - {str(e)}")
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.failed_tests:
            print("\n❌ Failed Tests:")
            for failure in self.failed_tests:
                print(f"   - {failure}")
        
        return self.tests_passed, self.tests_run, self.failed_tests

def main():
    tester = MarketingCampaignAPITester()
    passed, total, failures = tester.run_all_tests()
    
    # Return appropriate exit code
    return 0 if passed == total else 1

if __name__ == "__main__":
    sys.exit(main())