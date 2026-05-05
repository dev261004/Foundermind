
import os
import django
import sys

# Add the backend directory to the path
sys.path.append('/Users/dev/Documents/GitHub/Foundermind/foundermind_backend')

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'foundermind_backend.settings')
django.setup()

from apps.agent.idea_quality import check_idea_quality, refine_description

def test_quality_checker():
    title = "AI Grocery Helper"
    description = "A mobile app that uses AI to help people buy groceries more efficiently by suggesting recipes based on what they have."
    
    print(f"Testing quality check for: {title}")
    result = check_idea_quality(title, description)
    print("Quality Check Result:")
    import json
    print(json.dumps(result, indent=2))
    
    print("\nTesting description refinement...")
    refined = refine_description(title, description)
    print("Refined Description:")
    print(refined)

if __name__ == "__main__":
    test_quality_checker()
