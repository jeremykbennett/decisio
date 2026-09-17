import requests
import time

# Create a client manager via API for testing
def create_client_manager_for_testing():
    api_url = "https://choice-maker-43.preview.emergentagent.com/api"
    timestamp = str(int(time.time()))
    
    client_manager_data = {
        "email": f"test_cm_{timestamp}@test.com",
        "password": "TestPass123!",
        "full_name": f"Test Client Manager {timestamp}",
        "role": "client_manager"
    }
    
    try:
        response = requests.post(f"{api_url}/auth/register", json=client_manager_data)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Created client manager: {client_manager_data['email']}")
            return {
                "email": client_manager_data["email"],
                "password": client_manager_data["password"],
                "token": data["access_token"],
                "user": data["user"]
            }
        else:
            print(f"❌ Failed to create client manager: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Error creating client manager: {str(e)}")
        return None

if __name__ == "__main__":
    result = create_client_manager_for_testing()
    if result:
        print(f"Client Manager Email: {result['email']}")
        print(f"Client Manager Password: {result['password']}")
        print(f"Token: {result['token'][:50]}...")
    else:
        print("Failed to create client manager")