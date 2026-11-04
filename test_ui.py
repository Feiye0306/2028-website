import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Override the current date to ensure questions are loaded
        await page.add_init_script("""
            Date.now = () => new Date('2028-02-01T00:00:00Z').getTime();
        """)

        # Navigate to the local server
        await page.goto('http://localhost:8089/')

        try:
            # Wait for FAQ data to load
            await page.wait_for_selector('.faq-q-item', state='attached', timeout=5000)
        except Exception as e:
            print("Failed to find .faq-q-item.")
            raise e

        # Test case 1: Question without detail (e.g. week 1, idx 1, which corresponds to id=12 that has sources but NO detail)
        # Week 1 is default
        print("Testing Question without detail but with sources (Week 1, idx 1, id=12)")
        q12_item = page.locator('#faq-item-1')
        await q12_item.locator('.faq-q-header').click()
        await page.wait_for_timeout(500)  # Wait for accordion animation if any

        # It should ONLY have a source summary label, no details wrap
        q12_card = q12_item.locator('.faq-answer-floating-card')
        q12_source_summary = q12_card.locator('summary.source-summary-label:has-text("來源")')
        q12_detail_summary = q12_card.locator('summary.source-summary-label:has-text("詳細說明")')
        print(f"  Source Summary count (expected 1): {await q12_source_summary.count()}")
        print(f"  Detail Summary count (expected 0): {await q12_detail_summary.count()}")

        # Test case 2: Question with detail (Week 2, idx 0, which corresponds to id=14)
        # Select week 2 first
        print("Switching to Week 2")
        await page.evaluate('window.selectWeek(2)')
        await page.wait_for_timeout(500)

        # In week 2, id 14 is the first item (idx 0)
        print("Testing Question with detail (Week 2, idx 0, id=14)")
        q14_item = page.locator('#faq-item-0')
        await q14_item.locator('.faq-q-header').click()
        await page.wait_for_timeout(500)

        # It should ONLY have a detail summary label containing the source wrap
        q14_card = q14_item.locator('.faq-answer-floating-card')
        q14_source_summary = q14_card.locator('summary.source-summary-label:has-text("來源")')
        q14_detail_summary = q14_card.locator('summary.source-summary-label:has-text("詳細說明")')

        print(f"  Source Summary count (expected 0): {await q14_source_summary.count()}")
        print(f"  Detail Summary count (expected 1): {await q14_detail_summary.count()}")

        # Expand the detail to check inner content
        await q14_detail_summary.click()
        await page.wait_for_timeout(500)

        source_in_detail = q14_card.locator('.source-in-detail-wrap')
        print(f"  Source in detail wrap count (expected 1): {await source_in_detail.count()}")
        if await source_in_detail.count() > 0:
            title_text = await source_in_detail.locator('.source-in-detail-title').inner_text()
            print(f"  Inner title text: {title_text}")

        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())
