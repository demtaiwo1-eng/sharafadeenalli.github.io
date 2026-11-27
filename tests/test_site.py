import os
import time
import unittest
from pathlib import Path

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


BASE_URL = os.environ.get("WEBSITE_URL", "http://127.0.0.1:4173/")
ARTIFACTS = Path("test-artifacts")


class SarafadeenBrowserReview(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        ARTIFACTS.mkdir(exist_ok=True)
        options = Options()
        options.add_argument("--headless=new")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--window-size=1440,1000")
        options.add_argument("--disable-gpu")
        cls.driver = webdriver.Chrome(options=options)
        cls.driver.set_page_load_timeout(30)
        cls.wait = WebDriverWait(cls.driver, 10)

    @classmethod
    def tearDownClass(cls):
        if hasattr(cls, "driver"):
            cls.driver.quit()

    def setUp(self):
        self.driver.get(BASE_URL)
        self.wait.until(EC.presence_of_element_located((By.ID, "theme-toggle")))

    def screenshot(self, name):
        self.driver.save_screenshot(str(ARTIFACTS / name))

    def test_homepage_loads_and_defaults_to_light(self):
        self.assertIn("Sarafadeen", self.driver.title)
        self.assertEqual(
            "light",
            self.driver.find_element(By.TAG_NAME, "html").get_attribute("data-ephinta-theme"),
        )
        self.assertTrue(self.driver.find_element(By.ID, "view-home").is_displayed())
        self.assertTrue(self.driver.find_element(By.ID, "theme-toggle").is_displayed())
        self.screenshot("homepage-light.png")

    def test_theme_toggle_switches_and_persists(self):
        toggle = self.driver.find_element(By.ID, "theme-toggle")
        toggle.click()
        self.assertEqual(
            "dark",
            self.driver.find_element(By.TAG_NAME, "html").get_attribute("data-ephinta-theme"),
        )
        self.driver.refresh()
        self.wait.until(
            lambda d: d.find_element(By.TAG_NAME, "html").get_attribute("data-ephinta-theme") == "dark"
        )
        self.screenshot("homepage-dark.png")
        self.driver.find_element(By.ID, "theme-toggle").click()
        self.assertEqual(
            "light",
            self.driver.find_element(By.TAG_NAME, "html").get_attribute("data-ephinta-theme"),
        )

    def test_navigation_opens_each_primary_view(self):
        for view in ("updates", "monitoring", "operations", "field", "integrations"):
            link = self.driver.find_element(By.CSS_SELECTOR, '[data-view="' + view + '"]')
            self.driver.execute_script("arguments[0].click();", link)
            panel = self.driver.find_element(By.ID, "view-" + view)
            self.assertIn("active", panel.get_attribute("class"), view + " view did not activate")

    def test_api_connections_view_exposes_source_picker_controls(self):
        self.driver.find_element(By.CSS_SELECTOR, '[data-view="integrations"]').click()
        self.assertTrue(self.driver.find_element(By.ID, "view-integrations").is_displayed())
        self.assertTrue(self.driver.find_element(By.ID, "select-all-integrations").is_displayed())
        self.assertTrue(self.driver.find_element(By.ID, "clear-integrations").is_displayed())
        self.assertTrue(self.driver.find_element(By.ID, "refresh-integrations").is_displayed())
        self.screenshot("api-connections.png")

    def test_field_report_form_validates_and_saves_local_draft(self):
        self.driver.find_element(By.CSS_SELECTOR, '[data-view="field"]').click()
        self.wait.until(lambda d: "active" in d.find_element(By.ID, "view-field").get_attribute("class"))
        form = self.wait.until(EC.visibility_of_element_located((By.ID, "field-form")))
        self.driver.find_element(By.NAME, "category").send_keys("Other observation")
        self.driver.find_element(By.NAME, "lga").send_keys("Ibadan North")
        description = self.wait.until(EC.visibility_of_element_located((By.NAME, "description")))
        self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", description)
        description.click()
        description.send_keys("Selenium browser review: a public streetlight was observed not working.")
        self.driver.find_element(By.NAME, "accuracy").click()
        form.find_element(By.CSS_SELECTOR, 'button[type="submit"]').click()
        self.wait.until(
            EC.text_to_be_present_in_element((By.ID, "local-reports"), "Selenium browser review")
        )
        self.assertIn("NOT SUBMITTED", self.driver.find_element(By.ID, "local-reports").text)


if __name__ == "__main__":
    unittest.main(verbosity=2)
