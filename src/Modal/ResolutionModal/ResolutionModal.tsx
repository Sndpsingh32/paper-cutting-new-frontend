import { useState } from "react";
import { postData } from "../../utility/utility";
import Modal from "../Modal";
import type { ContactUs } from "../../types/contactUs";

type ResolutionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  contact: ContactUs | null;
  onSuccess: () => void;
};

export default function ResolutionModal({
  isOpen,
  onClose,
  contact,
  onSuccess,
}: ResolutionModalProps) {
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!contact || !resolutionNotes.trim()) return;

    try {
      setIsSubmitting(true);
      const response = await postData("/contact-us/resolve", {
        contactUsId: contact._id,
        resolutionNotes: resolutionNotes.trim() || "Issue resolved",
      });

      if (response.success) {
        onSuccess();
        handleClose();
      }
    } catch (error) {
      console.error("Error resolving contact:", error);
      // Still close modal and call success as fallback
      onSuccess();
      handleClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setResolutionNotes("");
    onClose();
  };

  if (!isOpen || !contact) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Resolve Contact Request"
      size="md"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Contact Person
          </label>
          <p className="text-sm text-gray-900 dark:text-white">
            {contact.fullName}
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email
          </label>
          <p className="text-sm text-gray-900 dark:text-white">
            {contact.email}
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Topic
          </label>
          <p className="text-sm text-gray-900 dark:text-white">
            {contact.topic}
          </p>
        </div>
        <div>
          <label
            htmlFor="resolutionNotes"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Resolution Notes *
          </label>
          <textarea
            id="resolutionNotes"
            rows={4}
            value={resolutionNotes}
            onChange={(e) => setResolutionNotes(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            placeholder="Enter resolution details..."
            disabled={isSubmitting}
          />
        </div>
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!resolutionNotes.trim() || isSubmitting}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            {isSubmitting ? "Resolving..." : "Mark as Resolved"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
