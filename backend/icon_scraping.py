#!/usr/bin/env python3
"""
Web scraper for SSB Wiki character head icons.

This script scrapes character head icons from the SSB Wiki, specifically
filtering for images containing "Website" in their filename and saving
them as PNG files to a local directory.

Requirements:
    pip install requests beautifulsoup4 pillow

Usage:
    python ssb_scraper.py
"""

import os
import time
import requests
from urllib.parse import urljoin, urlparse
from pathlib import Path
from typing import List, Tuple
from bs4 import BeautifulSoup
from PIL import Image
import io


def create_output_directory(directory_name: str = "characters") -> Path:
    """
    Create the output directory if it doesn't exist.

    Args:
        directory_name: Name of the directory to create

    Returns:
        Path object for the created directory
    """
    output_dir = Path(directory_name)
    output_dir.mkdir(exist_ok=True)
    print(f"Output directory: {output_dir.absolute()}")
    return output_dir


def get_page_content(url: str, headers: dict = None) -> BeautifulSoup:
    """
    Fetch and parse the HTML content of a web page.

    Args:
        url: The URL to scrape
        headers: Optional HTTP headers to include in the request

    Returns:
        BeautifulSoup object containing the parsed HTML

    Raises:
        requests.RequestException: If the HTTP request fails
    """
    if headers is None:
        # Use a reasonable user agent to be respectful
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }

    print(f"Fetching page: {url}")
    response = requests.get(url, headers=headers)
    response.raise_for_status()  # Raise an exception for bad status codes

    return BeautifulSoup(response.content, "html.parser")


def extract_image_urls(
    soup: BeautifulSoup, base_url: str, filter_keyword: str = "Website"
) -> List[Tuple[str, str]]:
    """
    Extract image URLs from the parsed HTML that match the filter criteria.

    Args:
        soup: BeautifulSoup object containing the parsed HTML
        base_url: Base URL for resolving relative URLs
        filter_keyword: Keyword that must be present in the image filename

    Returns:
        List of tuples containing (image_url, filename)
    """
    image_data = []

    # Look for images in various common containers
    # SSB Wiki uses different structures, so we'll be comprehensive
    img_tags = soup.find_all("img")

    for img in img_tags:
        src = img.get("src")
        alt = img.get("alt", "")

        if not src:
            continue

        # Convert relative URLs to absolute
        full_url = urljoin(base_url, src)

        # Extract filename from URL
        parsed_url = urlparse(full_url)
        filename = os.path.basename(parsed_url.path)

        # Apply filter - check both filename and alt text
        if (
            filter_keyword.lower() in filename.lower()
            or filter_keyword.lower() in alt.lower()
        ):
            print(f"Found matching image: {filename}")
            image_data.append((full_url, filename))

    print(f"Found {len(image_data)} images matching '{filter_keyword}'")
    return image_data


def download_and_convert_image(
    url: str, output_path: Path, headers: dict = None
) -> bool:
    """
    Download an image and convert it to PNG format.

    Args:
        url: URL of the image to download
        output_path: Path where the PNG file should be saved
        headers: Optional HTTP headers for the request

    Returns:
        True if successful, False otherwise
    """
    try:
        print(f"Downloading: {url}")

        if headers is None:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }

        response = requests.get(url, headers=headers)
        response.raise_for_status()

        # Open the image using PIL to handle format conversion
        image = Image.open(io.BytesIO(response.content))

        # Convert to RGB if necessary (for PNG compatibility)
        if image.mode in ("RGBA", "LA", "P"):
            # Keep transparency for these modes
            image = image.convert("RGBA")
        elif image.mode != "RGB":
            image = image.convert("RGB")

        # Save as PNG
        image.save(output_path, "PNG", optimize=True)
        print(f"Saved: {output_path}")
        return True

    except Exception as e:
        print(f"Error downloading {url}: {str(e)}")
        return False


def scrape_ssb_wiki_images(
    url: str, output_dir: str = "characters", filter_keyword: str = "Website"
) -> None:
    """
    Main function to scrape SSB Wiki images.

    Args:
        url: The wiki page URL to scrape
        output_dir: Directory name to save images
        filter_keyword: Keyword to filter images by
    """
    try:
        # Create output directory
        output_path = create_output_directory(output_dir)

        # Get page content
        soup = get_page_content(url)

        # Extract image URLs
        image_data = extract_image_urls(soup, url, filter_keyword)

        if not image_data:
            print(f"No images found with '{filter_keyword}' in the name.")
            return

        # Download images with respectful delay
        successful_downloads = 0
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }

        for img_url, original_filename in image_data:
            # Create PNG filename
            name_without_ext = os.path.splitext(original_filename)[0]
            name_without_ext = name_without_ext.replace("HeadSSBUWebsite", "")
            name_without_ext = name_without_ext.replace("120px-", "")
            png_filename = f"{name_without_ext}.png"
            output_file_path = output_path / png_filename

            # Skip if file already exists
            if output_file_path.exists():
                print(f"Skipping {png_filename} (already exists)")
                continue

            # Download and convert
            if download_and_convert_image(img_url, output_file_path, headers):
                successful_downloads += 1

            # Be respectful - add delay between requests
            time.sleep(1)  # 1 second delay between downloads

        print(
            f"\nCompleted! Successfully downloaded {successful_downloads} out of {len(image_data)} images."
        )
        print(f"Images saved to: {output_path.absolute()}")

    except Exception as e:
        print(f"Error during scraping: {str(e)}")
        raise


if __name__ == "__main__":
    # Configuration
    WIKI_URL = "https://www.ssbwiki.com/Category:Head_icons_(SSBU)"
    OUTPUT_DIRECTORY = "characters"
    FILTER_KEYWORD = "Website"

    # Run the scraper
    scrape_ssb_wiki_images(WIKI_URL, OUTPUT_DIRECTORY, FILTER_KEYWORD)
