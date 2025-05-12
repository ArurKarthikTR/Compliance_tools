import os
import sys
import requests
import json
from pathlib import Path

def create_test_xml_files():
    """
    Create sample source and target XML files for testing
    """
    source_xml = """<root>
  <person>
    <firstname>Orsola</firstname>
    <lastname>Stefa</lastname>
    <city>Bogotá</city>
    <country>Cambodia</country>
    <firstname2>Silvana</firstname2>
    <lastname2>Carmena</lastname2>
    <email>Silvana.Carmena@yopmail.com</email>
  </person>
  <random>72</random>
</root>"""

    target_xml = """<root>
  <date>1984-03-15</date>
  <elt>Carly</elt>
  <enum>generator</enum>
  <person city="Bogotá">
    <elt>Marika</elt>
    <elt>Nessie</elt>
    <elt>Cristine</elt>
    <elt>Kirbee</elt>
    <elt>Phedra</elt>
  </person>
  <Annora>
    <age>34</age>
  </Annora>
</root>"""

    # Save the XML files
    upload_dir = Path("../unified-backend/uploads")
    os.makedirs(upload_dir, exist_ok=True)
    
    source_path = upload_dir / "test-source.xml"
    target_path = upload_dir / "test-target.xml"
    
    with open(source_path, "w") as f:
        f.write(source_xml)
    
    with open(target_path, "w") as f:
        f.write(target_xml)
    
    print(f"Created test XML files at: {source_path} and {target_path}")
    return source_path, target_path

def test_xml_comparison():
    """
    Test XML comparison functionality by sending a request to the backend
    """
    source_path, target_path = create_test_xml_files()
    
    api_url = 'http://localhost:5000/api/file-difference/upload'
    
    # Create multipart form data
    files = {
        'sourceFile': open(source_path, 'rb'),
        'targetFile': open(target_path, 'rb')
    }
    
    try:
        # Make the request
        print("Sending XML files for comparison...")
        response = requests.post(api_url, files=files)
        
        # Check response
        if response.status_code == 200:
            result = response.json()
            print("Comparison successful!")
            print(f"File type: {result.get('fileType', 'unknown')}")
            print(f"Total rows: {result.get('summary', {}).get('totalRows', 0)}")
            print(f"Matching rows: {result.get('summary', {}).get('matchingRows', 0)}")
            print(f"Differing rows: {result.get('summary', {}).get('differingRows', 0)}")
            
            # Save result to file for examination
            output_file = "xml-comparison-result.json"
            with open(output_file, "w") as f:
                json.dump(result, f, indent=2)
            print(f"Full result saved to {output_file}")
            
            # Count different types of differences
            different_count = 0
            source_only_count = 0
            target_only_count = 0
            
            for row in result.get('rows', []):
                for path, cell in row.get('cells', {}).items():
                    status = cell.get('status')
                    if status == 'different':
                        different_count += 1
                        print(f"Different value: {path}")
                        print(f"  Source: {cell.get('sourceValue')}")
                        print(f"  Target: {cell.get('targetValue')}")
                    elif status == 'source_only':
                        source_only_count += 1
                        print(f"Source only: {path} = {cell.get('sourceValue')}")
                    elif status == 'target_only':
                        target_only_count += 1
                        print(f"Target only: {path} = {cell.get('targetValue')}")
            
            print(f"\nDifferent values: {different_count}")
            print(f"Source-only values: {source_only_count}")
            print(f"Target-only values: {target_only_count}")
            
        else:
            print(f"Error: {response.status_code}")
            print(response.text)
    
    except Exception as e:
        print(f"Error: {e}")
    
    finally:
        # Close file handles
        for f in files.values():
            f.close()

if __name__ == "__main__":
    test_xml_comparison()
