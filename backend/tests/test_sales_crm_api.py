"""
Sales CRM API Backend Tests
Tests: Auth, Leads, Call Sessions, Follow-ups, Dashboards
"""
import pytest
import requests
import os
from datetime import datetime, timezone, timedelta

# Read from frontend .env file
BASE_URL = "https://call-track-crm-2.preview.emergentagent.com"

# Test credentials from /app/memory/test_credentials.md
ADMIN_EMAIL = "admin@salescrm.com"
ADMIN_PASSWORD = "admin123"
SALES_EMAIL = "rahul@salescrm.com"
SALES_PASSWORD = "sales123"


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture
def admin_token(api_client):
    """Get admin auth token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Admin login failed: {response.status_code}")
    return response.json()["access_token"]


@pytest.fixture
def sales_token(api_client):
    """Get sales user auth token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": SALES_EMAIL,
        "password": SALES_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Sales login failed: {response.status_code}")
    return response.json()["access_token"]


class TestAuth:
    """Authentication endpoint tests"""

    def test_login_admin_success(self, api_client):
        """Test admin login with correct credentials"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "Missing access_token in response"
        assert "user" in data, "Missing user in response"
        assert data["user"]["email"] == ADMIN_EMAIL.lower()
        assert data["user"]["role"] == "admin"

    def test_login_sales_success(self, api_client):
        """Test sales user login with correct credentials"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": SALES_EMAIL,
            "password": SALES_PASSWORD
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == SALES_EMAIL.lower()
        assert data["user"]["role"] == "sales"

    def test_login_invalid_credentials(self, api_client):
        """Test login with invalid credentials"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpass"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"

    def test_get_me_with_token(self, api_client, admin_token):
        """Test /auth/me endpoint with valid token"""
        response = api_client.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["email"] == ADMIN_EMAIL.lower()
        assert data["role"] == "admin"

    def test_get_me_without_token(self, api_client):
        """Test /auth/me endpoint without token"""
        response = api_client.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"


class TestLeads:
    """Leads CRUD tests"""

    def test_list_leads_as_admin(self, api_client, admin_token):
        """Test admin can list all leads"""
        response = api_client.get(
            f"{BASE_URL}/api/leads",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "leads" in data
        assert "total" in data
        assert isinstance(data["leads"], list)
        assert data["total"] >= 0

    def test_list_leads_as_sales(self, api_client, sales_token):
        """Test sales user can list assigned leads"""
        response = api_client.get(
            f"{BASE_URL}/api/leads",
            headers={"Authorization": f"Bearer {sales_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "leads" in data
        assert isinstance(data["leads"], list)

    def test_create_lead_and_verify(self, api_client, sales_token):
        """Test creating a lead and verify persistence"""
        create_payload = {
            "full_name": "TEST_John Doe",
            "phone_number": "+919999999999",
            "company_name": "Test Corp",
            "source": "website",
            "city": "Mumbai"
        }
        
        # Create lead
        create_response = api_client.post(
            f"{BASE_URL}/api/leads",
            json=create_payload,
            headers={"Authorization": f"Bearer {sales_token}"}
        )
        assert create_response.status_code == 200, f"Expected 200, got {create_response.status_code}: {create_response.text}"
        
        created_lead = create_response.json()
        assert created_lead["full_name"] == create_payload["full_name"]
        assert created_lead["phone_number"] == create_payload["phone_number"]
        assert "id" in created_lead
        lead_id = created_lead["id"]
        
        # Verify persistence with GET
        get_response = api_client.get(
            f"{BASE_URL}/api/leads/{lead_id}",
            headers={"Authorization": f"Bearer {sales_token}"}
        )
        assert get_response.status_code == 200, f"Expected 200, got {get_response.status_code}"
        
        fetched_lead = get_response.json()
        assert fetched_lead["id"] == lead_id
        assert fetched_lead["full_name"] == create_payload["full_name"]

    def test_get_lead_detail(self, api_client, sales_token):
        """Test getting lead detail with enriched data"""
        # First create a lead
        create_response = api_client.post(
            f"{BASE_URL}/api/leads",
            json={
                "full_name": "TEST_Detail Lead",
                "phone_number": "+919888888888",
                "source": "referral"
            },
            headers={"Authorization": f"Bearer {sales_token}"}
        )
        lead_id = create_response.json()["id"]
        
        # Get lead detail
        response = api_client.get(
            f"{BASE_URL}/api/leads/{lead_id}",
            headers={"Authorization": f"Bearer {sales_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == lead_id
        assert "call_sessions" in data
        assert "notes_list" in data
        assert "follow_ups" in data
        assert isinstance(data["call_sessions"], list)

    def test_update_lead(self, api_client, sales_token):
        """Test updating a lead"""
        # Create lead
        create_response = api_client.post(
            f"{BASE_URL}/api/leads",
            json={
                "full_name": "TEST_Update Lead",
                "phone_number": "+919777777777",
                "source": "cold_call"
            },
            headers={"Authorization": f"Bearer {sales_token}"}
        )
        lead_id = create_response.json()["id"]
        
        # Update lead
        update_response = api_client.put(
            f"{BASE_URL}/api/leads/{lead_id}",
            json={"status": "interested", "company_name": "Updated Corp"},
            headers={"Authorization": f"Bearer {sales_token}"}
        )
        assert update_response.status_code == 200
        
        # Verify update
        get_response = api_client.get(
            f"{BASE_URL}/api/leads/{lead_id}",
            headers={"Authorization": f"Bearer {sales_token}"}
        )
        updated_lead = get_response.json()
        assert updated_lead["status"] == "interested"
        assert updated_lead["company_name"] == "Updated Corp"


class TestCallSessions:
    """Call session tests"""

    def test_create_call_session(self, api_client, sales_token):
        """Test creating a call session"""
        # First create a lead
        lead_response = api_client.post(
            f"{BASE_URL}/api/leads",
            json={
                "full_name": "TEST_Call Lead",
                "phone_number": "+919666666666",
                "source": "website"
            },
            headers={"Authorization": f"Bearer {sales_token}"}
        )
        lead_id = lead_response.json()["id"]
        
        # Create call session
        session_response = api_client.post(
            f"{BASE_URL}/api/call-sessions",
            json={
                "lead_id": lead_id,
                "dialed_number": "+919666666666"
            },
            headers={"Authorization": f"Bearer {sales_token}"}
        )
        assert session_response.status_code == 200, f"Expected 200, got {session_response.status_code}: {session_response.text}"
        
        session = session_response.json()
        assert session["lead_id"] == lead_id
        assert session["dialed_number"] == "+919666666666"
        assert "id" in session

    def test_update_call_session(self, api_client, sales_token):
        """Test updating call session with outcome"""
        # Create lead and call session
        lead_response = api_client.post(
            f"{BASE_URL}/api/leads",
            json={
                "full_name": "TEST_Update Call",
                "phone_number": "+919555555555",
                "source": "referral"
            },
            headers={"Authorization": f"Bearer {sales_token}"}
        )
        lead_id = lead_response.json()["id"]
        
        session_response = api_client.post(
            f"{BASE_URL}/api/call-sessions",
            json={"lead_id": lead_id, "dialed_number": "+919555555555"},
            headers={"Authorization": f"Bearer {sales_token}"}
        )
        session_id = session_response.json()["id"]
        
        # Update session
        update_response = api_client.put(
            f"{BASE_URL}/api/call-sessions/{session_id}",
            json={
                "outcome": "connected",
                "duration_seconds": 120,
                "call_notes": "Good conversation"
            },
            headers={"Authorization": f"Bearer {sales_token}"}
        )
        assert update_response.status_code == 200
        
        updated_session = update_response.json()
        assert updated_session["outcome"] == "connected"
        assert updated_session["duration_seconds"] == 120

    def test_list_call_sessions(self, api_client, sales_token):
        """Test listing call sessions"""
        response = api_client.get(
            f"{BASE_URL}/api/call-sessions",
            headers={"Authorization": f"Bearer {sales_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "sessions" in data
        assert "total" in data
        assert isinstance(data["sessions"], list)


class TestFollowUps:
    """Follow-up tests"""

    def test_create_follow_up(self, api_client, sales_token):
        """Test creating a follow-up"""
        # Create lead
        lead_response = api_client.post(
            f"{BASE_URL}/api/leads",
            json={
                "full_name": "TEST_FollowUp Lead",
                "phone_number": "+919444444444",
                "source": "trade_show"
            },
            headers={"Authorization": f"Bearer {sales_token}"}
        )
        lead_id = lead_response.json()["id"]
        
        # Create follow-up
        tomorrow = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
        followup_response = api_client.post(
            f"{BASE_URL}/api/follow-ups",
            json={
                "lead_id": lead_id,
                "follow_up_at": tomorrow,
                "follow_up_type": "call",
                "note": "Follow up on proposal"
            },
            headers={"Authorization": f"Bearer {sales_token}"}
        )
        assert followup_response.status_code == 200
        
        followup = followup_response.json()
        assert followup["lead_id"] == lead_id
        assert followup["status"] == "pending"

    def test_list_follow_ups(self, api_client, sales_token):
        """Test listing follow-ups"""
        response = api_client.get(
            f"{BASE_URL}/api/follow-ups",
            headers={"Authorization": f"Bearer {sales_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "follow_ups" in data
        assert "total" in data

    def test_list_follow_ups_by_tab(self, api_client, sales_token):
        """Test follow-ups filtering by tab (overdue, today, upcoming)"""
        for tab in ["overdue", "today", "upcoming"]:
            response = api_client.get(
                f"{BASE_URL}/api/follow-ups?tab={tab}",
                headers={"Authorization": f"Bearer {sales_token}"}
            )
            assert response.status_code == 200, f"Tab {tab} failed"
            data = response.json()
            assert "follow_ups" in data


class TestDashboards:
    """Dashboard endpoint tests"""

    def test_sales_dashboard(self, api_client, sales_token):
        """Test sales dashboard metrics"""
        response = api_client.get(
            f"{BASE_URL}/api/dashboard/sales",
            headers={"Authorization": f"Bearer {sales_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "calls_today" in data
        assert "follow_ups_due" in data
        assert "assigned_leads" in data
        assert "pending_recordings" in data
        assert isinstance(data["calls_today"], int)
        assert isinstance(data["assigned_leads"], int)

    def test_admin_dashboard(self, api_client, admin_token):
        """Test admin dashboard metrics"""
        response = api_client.get(
            f"{BASE_URL}/api/dashboard/admin",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "total_calls_today" in data
        assert "connected_calls_today" in data
        assert "total_leads" in data
        assert "pending_follow_ups" in data
        assert "uploaded_recordings" in data
        assert "salesperson_performance" in data
        assert isinstance(data["salesperson_performance"], list)

    def test_admin_dashboard_requires_admin_role(self, api_client, sales_token):
        """Test that sales user cannot access admin dashboard"""
        response = api_client.get(
            f"{BASE_URL}/api/dashboard/admin",
            headers={"Authorization": f"Bearer {sales_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"


class TestUsers:
    """User endpoints tests"""

    def test_list_users(self, api_client, admin_token):
        """Test listing all users"""
        response = api_client.get(
            f"{BASE_URL}/api/users",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        users = response.json()
        assert isinstance(users, list)
        assert len(users) >= 3  # At least admin + 2 sales users

    def test_list_sales_users(self, api_client, sales_token):
        """Test listing sales users only"""
        response = api_client.get(
            f"{BASE_URL}/api/users/sales",
            headers={"Authorization": f"Bearer {sales_token}"}
        )
        assert response.status_code == 200
        
        users = response.json()
        assert isinstance(users, list)
        for user in users:
            assert user["role"] == "sales"
