import datetime
import unittest
from unittest.mock import patch

from rest_framework.test import APIRequestFactory

from apps.ideas import views as idea_views


class FakeIdeaQuerySet:
    def __init__(self, result):
        self.result = result

    def first(self):
        return self.result


class FakeIdea:
    def __init__(self, *, idea_id="idea-1", title="Chaidesk", description="Desk ops", status="active"):
        self.id = idea_id
        self.title = title
        self.description = description
        self.status = status
        self.updated_at = datetime.datetime(2026, 5, 6)

    def save(self):
        return None

    def to_json(self):
        return {
            "id": str(self.id),
            "title": self.title,
            "description": self.description,
            "status": self.status,
            "updated_at": self.updated_at.isoformat(),
        }


class IdeaUpdateViewTests(unittest.TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

    def test_update_idea_changed_content_resets_prior_analysis(self):
        fake_idea = FakeIdea()
        request = self.factory.patch(
            "/ideas/idea-1/",
            {
                "title": "Chaidesk v2",
                "description": "Updated workflow automation concept",
                "reset_analysis": True,
            },
            format="json",
        )

        with (
            patch("apps.ideas.views.Idea.objects", return_value=FakeIdeaQuerySet(fake_idea)),
            patch("apps.ideas.views.StartupAnalysisService.delete_analysis_artifacts_for_idea") as delete_artifacts,
        ):
            response = idea_views.update_idea(request, str(fake_idea.id))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["message"], "Idea updated successfully")
        self.assertTrue(response.data["rerun_required"])
        self.assertEqual(fake_idea.title, "Chaidesk v2")
        self.assertEqual(fake_idea.description, "Updated workflow automation concept")
        delete_artifacts.assert_called_once_with(str(fake_idea.id))

    def test_update_idea_unchanged_content_keeps_existing_history(self):
        fake_idea = FakeIdea()
        request = self.factory.patch(
            "/ideas/idea-1/",
            {
                "title": fake_idea.title,
                "description": fake_idea.description,
                "reset_analysis": True,
            },
            format="json",
        )

        with (
            patch("apps.ideas.views.Idea.objects", return_value=FakeIdeaQuerySet(fake_idea)),
            patch("apps.ideas.views.StartupAnalysisService.delete_analysis_artifacts_for_idea") as delete_artifacts,
        ):
            response = idea_views.update_idea(request, str(fake_idea.id))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["message"], "Idea unchanged")
        self.assertFalse(response.data["rerun_required"])
        delete_artifacts.assert_not_called()


if __name__ == "__main__":
    unittest.main()
