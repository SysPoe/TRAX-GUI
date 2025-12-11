
from playwright.sync_api import Page, expect, sync_playwright

def verify_admin_status(page: Page):
    # Navigate to admin home page
    page.goto("http://localhost:4173/admin")

    # The admin page requires login
    if "login" in page.url:
        print("Redirected to login page. Logging in...")
        page.fill("input[name='password']", "admin")
        page.click("button[type='submit']")

        # Increased timeout and use explicit wait for navigation
        try:
            page.wait_for_url("**/admin", timeout=10000)
        except Exception as e:
            print(f"Wait for URL failed: {e}")
            print(f"Current URL: {page.url}")
            # Take a screenshot to debug
            page.screenshot(path="/home/jules/verification/debug_fail.png")
            raise e

    print(f"Current URL after login attempt: {page.url}")

    # Now we should be on the admin home page.
    expect(page.get_by_role("heading", name="Admin Home")).to_be_visible()

    # Check for System Status section
    expect(page.get_by_text("System Status")).to_be_visible()
    expect(page.get_by_text("Server Uptime")).to_be_visible()
    expect(page.get_by_text("Last Static Refresh")).to_be_visible()

    # Check for Cache Statistics section
    expect(page.get_by_text("Cache Statistics")).to_be_visible()
    expect(page.get_by_text("Static Routes")).to_be_visible()

    # Take screenshot
    page.screenshot(path="/home/jules/verification/admin_status.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_admin_status(page)
        finally:
            browser.close()
