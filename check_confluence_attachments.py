#!/usr/bin/env python3
"""Check Confluence attachments and optionally update page content"""
import os
import sys
from confluence_uploader import ConfluenceUploader
from datetime import datetime


def main():
    """Check attachments and update page content"""
    print("="*60)
    print("Confluence Attachments Checker")
    print("="*60)
    
    try:
        uploader = ConfluenceUploader()
        page_id = uploader.page_id
        
        if not page_id:
            print("\n✗ Error: CONFLUENCE_PAGE_ID not set in .env file")
            print("   Add CONFLUENCE_PAGE_ID=279707663 to your .env file")
            sys.exit(1)
        
        print(f"\nChecking page ID: {page_id}")
        
        # List all attachments
        print("\nFetching attachments...")
        attachments = uploader.list_attachments()
        
        if not attachments:
            print("\n✗ No attachments found on this page")
            print("   Make sure CONFLUENCE_PAGE_ID is correct")
            return
        
        print(f"\n✓ Found {len(attachments)} attachment(s):\n")
        
        # Filter and display PPTX files
        pptx_files = [a for a in attachments if a.get('title', '').endswith('.pptx')]
        
        if not pptx_files:
            print("  No PowerPoint (.pptx) files found")
        else:
            print("  PowerPoint Reports:")
            for i, att in enumerate(pptx_files, 1):
                title = att.get('title', 'Unknown')
                size = att.get('extensions', {}).get('fileSize', 0)
                size_mb = size / (1024 * 1024) if size > 0 else 0
                
                # Extract date from filename
                date_str = ""
                try:
                    parts = title.replace('.pptx', '').split('_')
                    if len(parts) >= 4:
                        date_part = parts[-2]  # YYYYMMDD
                        if len(date_part) == 8:
                            date_obj = datetime.strptime(date_part, '%Y%m%d')
                            date_str = f" ({date_obj.strftime('%B %d, %Y')})"
                except:
                    pass
                
                print(f"    {i}. {title}{date_str} ({size_mb:.1f} MB)")
        
        # Other files
        other_files = [a for a in attachments if not a.get('title', '').endswith('.pptx')]
        if other_files:
            print("\n  Other Files:")
            for i, att in enumerate(other_files, 1):
                print(f"    {i}. {att.get('title', 'Unknown')}")
        
        # Ask if user wants to update page content
        print("\n" + "="*60)
        print("Page Content Update")
        print("="*60)
        print("\nAttachments are uploaded but may not be visible in page content.")
        print("Would you like to add attachment links to the page content?")
        
        if len(sys.argv) > 1 and sys.argv[1] == '--auto':
            update = True
        else:
            response = input("\nUpdate page content? (y/n): ").strip().lower()
            update = response in ['y', 'yes']
        
        if update:
            print("\nUpdating page content...")
            if uploader.add_attachments_to_page_content():
                print("\n✓ Page content updated successfully!")
                print(f"  View your page: https://tailored-prod.atlassian.net/wiki/spaces/TR/pages/{page_id}/RentalSprintMetrics")
            else:
                print("\n⚠ Could not update page content automatically")
                print("  You can manually add attachments to the page:")
                print("  1. Click 'Edit' on the Confluence page")
                print("  2. Type '/' and search for 'attachments' macro")
                print("  3. Add the macro to display all attachments")
        else:
            print("\nSkipping page content update.")
            print("\nTo view attachments:")
            print("  1. Go to your Confluence page")
            print("  2. Click '...' (three dots) → 'View attachments'")
            print("  3. Or add the attachments macro manually when editing the page")
        
    except ValueError as e:
        print(f"\n✗ Configuration error: {str(e)}")
        print("   Make sure CONFLUENCE_EMAIL and CONFLUENCE_API_TOKEN are set in .env")
        sys.exit(1)
    except Exception as e:
        print(f"\n✗ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
