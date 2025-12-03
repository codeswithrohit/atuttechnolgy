import React, { useState, useEffect } from "react";
import { firebase } from "../../Firebase/config"; // Assuming this path is correct
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { 
  FaPlus, 
  FaTrash, 
  FaUpload, 
  FaTimes, 
  FaEdit, 
  FaChevronDown, 
  FaChevronUp, 
  FaPlay, 
  FaImage, 
  FaBook, 
  FaQuestionCircle, 
  FaMoneyBillWave, 
  FaTag 
} from "react-icons/fa";

// --- Configuration ---
// Primary Brand Color: #FF5F1F (Vibrant Orange/Vermilion)
const PRIMARY_COLOR_CLASS = "bg-[#FF5F1F]";
const PRIMARY_TEXT_CLASS = "text-[#FF5F1F]";
const PRIMARY_HOVER_CLASS = "hover:bg-[#E5551B]";
const PRIMARY_FOCUS_RING = "focus:ring-[#FF5F1F]/50";
const ACCENT_BG_CLASS = "bg-orange-50"; // Lighter accent background

const Course = () => {
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState("");
  const [chapter, setChapter] = useState("");
  const [price, setPrice] = useState("");
  const [offerprice, setOfferprice] = useState("");
  const [topics, setTopics] = useState([]); // Array of { name: string, resources: [], questions: [] }
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const [courses, setCourses] = useState([]);
  const [expandedCourse, setExpandedCourse] = useState(null);
  const [editingCourse, setEditingCourse] = useState(null);

  // Initial resource structure
  const initialResource = {
    title: "", // Title for the resource group
    resourceType: "pdf", // 'pdf' or 'video'
    files: [], // Array to hold File objects or download URL strings
  };

  // Initial question structure
  const initialQuestion = {
    questionText: "",
    videoFiles: [], // Array to hold File objects or download URL strings for multiple videos
    questionImageFile: null, // Single File object or download URL string for the image
  };

  // Function to add a new TOPIC
  const addTopic = () => {
    setTopics([...topics, { name: "", resources: [initialResource], questions: [initialQuestion] }]);
  };

  // Function to remove a TOPIC
  const removeTopic = (index) => {
    setTopics(topics.filter((_, i) => i !== index));
  };

  // --- Resource Management Functions (Unchanged) ---
  const addResourceToTopic = (topicIndex) => {
    const newTopics = [...topics];
    newTopics[topicIndex].resources.push(initialResource);
    setTopics(newTopics);
  };
  
  const removeResourceFromTopic = (topicIndex, resourceIndex) => {
    const newTopics = [...topics];
    newTopics[topicIndex].resources = newTopics[topicIndex].resources.filter(
      (_, i) => i !== resourceIndex
    );
    setTopics(newTopics);
  };
  
  const handleResourceTitleChange = (topicIndex, resourceIndex, title) => {
    const newTopics = [...topics];
    newTopics[topicIndex].resources[resourceIndex].title = title;
    setTopics(newTopics);
  };
  
  const handleResourceFilesChange = (topicIndex, resourceIndex, newFiles) => {
    const newTopics = [...topics];
    const resource = newTopics[topicIndex].resources[resourceIndex];
    const filesArray = Array.from(newFiles);

    if (resource.resourceType === 'pdf') {
      resource.files = filesArray.slice(0, 1);
    } else {
      const currentFiles = resource.files || [];
      resource.files = [...currentFiles, ...filesArray];
    }
    setTopics(newTopics);
  };
  
  const handleRemoveFileFromResource = (topicIndex, resourceIndex, fileIndex) => {
    const newTopics = [...topics];
    newTopics[topicIndex].resources[resourceIndex].files = newTopics[topicIndex].resources[resourceIndex].files.filter(
      (_, i) => i !== fileIndex
    );
    setTopics(newTopics);
  };
  
  const handleResourceTypeChange = (topicIndex, resourceIndex, type) => {
    const newTopics = [...topics];
    newTopics[topicIndex].resources[resourceIndex].resourceType = type;
    newTopics[topicIndex].resources[resourceIndex].files = []; // Clear files on type change
    setTopics(newTopics);
  };

  // --- Question Management Functions (Unchanged) ---
  const addQuestionToTopic = (topicIndex) => {
    const newTopics = [...topics];
    newTopics[topicIndex].questions.push(initialQuestion);
    setTopics(newTopics);
  };
  
  const removeQuestionFromTopic = (topicIndex, questionIndex) => {
    const newTopics = [...topics];
    newTopics[topicIndex].questions = newTopics[topicIndex].questions.filter(
      (_, i) => i !== questionIndex
    );
    setTopics(newTopics);
  };
  
  const handleQuestionTextChange = (topicIndex, questionIndex, text) => {
    const newTopics = [...topics];
    newTopics[topicIndex].questions[questionIndex].questionText = text;
    setTopics(newTopics);
  };
  
  const handleQuestionVideoFilesChange = (topicIndex, questionIndex, newFiles) => {
    const newTopics = [...topics];
    const question = newTopics[topicIndex].questions[questionIndex];

    const filesArray = Array.from(newFiles);
    const currentFiles = question.videoFiles || [];
    question.videoFiles = [...currentFiles, ...filesArray];

    setTopics(newTopics);
  };
  
  const handleRemoveVideoFileFromQuestion = (topicIndex, questionIndex, fileIndex) => {
    const newTopics = [...topics];
    newTopics[topicIndex].questions[questionIndex].videoFiles = newTopics[topicIndex].questions[questionIndex].videoFiles.filter(
      (_, i) => i !== fileIndex
    );
    setTopics(newTopics);
  };
  
  const handleQuestionImageFileChange = (topicIndex, questionIndex, newFiles) => {
    const newTopics = [...topics];
    const file = newFiles && newFiles.length > 0 ? newFiles[0] : null;

    newTopics[topicIndex].questions[questionIndex].questionImageFile = file;
    setTopics(newTopics);
  };
  
  const handleRemoveQuestionImageFile = (topicIndex, questionIndex) => {
    const newTopics = [...topics];
    newTopics[topicIndex].questions[questionIndex].questionImageFile = null;
    setTopics(newTopics);
  };


  // Upload files and submit data (Unchanged logic)
  const handleSubmit = async () => {
    if (!subject || !chapter || !price || !offerprice || topics.length === 0) {
      toast.error("Please fill all required fields!");
      return;
    }

    setLoading(true);
    setProgress(0);
    const db = firebase.firestore();
    const storage = firebase.storage();
    const courseRef = editingCourse ? db.collection("courses").doc(editingCourse.id) : db.collection("courses");
    let uploadedTopics = [];
    let chapterImageUrl = ""; 

    // Calculate total files to upload
    let totalFiles = 0;
    topics.forEach(topic => {
      topic.resources.forEach(resource => {
        resource.files.forEach(file => {
          if (file && typeof file !== 'string') totalFiles++;
        });
      });
      topic.questions.forEach(question => {
        question.videoFiles.forEach(file => {
          if (file && typeof file !== 'string') totalFiles++;
        });
        if (question.questionImageFile && typeof question.questionImageFile !== 'string') {
            totalFiles++;
        }
      });
    });

    let uploadedCount = 0;

    for (let i = 0; i < topics.length; i++) {
      const topic = topics[i];
      let uploadedResources = [];
      let uploadedQuestions = [];

      // --- Process Resources ---
      for (const resource of topic.resources) {
        let uploadedFileUrls = [];

        for (const file of resource.files) {
          let uploadedFileUrl = file;

          if (file && typeof file !== 'string') {
            const fileExtension = resource.resourceType === 'pdf' ? 'pdf' : 
                                file.name.split('.').pop() || 'mp4';
            const fileName = `${resource.title.replace(/\s/g, '_')}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            const fileRef = storage.ref(`courses/${subject}/${chapter}/${topic.name}/resources/${fileName}.${fileExtension}`);

            const uploadTask = fileRef.put(file);

            try {
              await uploadTask;
              uploadedFileUrl = await fileRef.getDownloadURL();
              uploadedCount++;
              setProgress((uploadedCount / totalFiles) * 100);
            } catch (error) {
              console.error("Upload failed for file:", file.name, error);
              toast.error(`Failed to upload ${file.name}`);
              setLoading(false);
              return;
            }
          }

          uploadedFileUrls.push(uploadedFileUrl);
        }

        uploadedResources.push({
          title: resource.title,
          resourceType: resource.resourceType,
          fileUrls: uploadedFileUrls,
        });
      }

      // --- Process Questions ---
      for (const question of topic.questions) {
        let uploadedVideoUrls = [];
        let uploadedQuestionImageUrl = question.questionImageFile;

        // 1. Process Question Image File
        if (question.questionImageFile && typeof question.questionImageFile !== 'string') {
            const imageFile = question.questionImageFile;
            const fileExtension = imageFile.name.split('.').pop() || 'jpg';
            const questionName = question.questionText.substring(0, 20).replace(/\s/g, '_') || 'question';
            const fileName = `${questionName}_image_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            const fileRef = storage.ref(`courses/${subject}/${chapter}/${topic.name}/questions/images/${fileName}.${fileExtension}`);

            const uploadTask = fileRef.put(imageFile);

            try {
                await uploadTask;
                uploadedQuestionImageUrl = await fileRef.getDownloadURL();
                uploadedCount++;
                setProgress((uploadedCount / totalFiles) * 100);
            } catch (error) {
                console.error("Upload failed for question image:", imageFile.name, error);
                toast.error(`Failed to upload question image ${imageFile.name}`);
                setLoading(false);
                return;
            }
        }
        
        // 2. Process Question Video Files
        for (const file of question.videoFiles) {
          let uploadedVideoUrl = file;

          if (file && typeof file !== 'string') {
            const fileExtension = file.name.split('.').pop() || 'mp4';
            const questionName = question.questionText.substring(0, 20).replace(/\s/g, '_') || 'question';
            const fileName = `${questionName}_video_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            const fileRef = storage.ref(`courses/${subject}/${chapter}/${topic.name}/questions/videos/${fileName}.${fileExtension}`);

            const uploadTask = fileRef.put(file);

            try {
              await uploadTask;
              uploadedVideoUrl = await fileRef.getDownloadURL();
              uploadedCount++;
              setProgress((uploadedCount / totalFiles) * 100);
            } catch (error) {
              console.error("Upload failed for question video:", file.name, error);
              toast.error(`Failed to upload video ${file.name}`);
              setLoading(false);
              return;
            }
          }
          uploadedVideoUrls.push(uploadedVideoUrl);
        }

        uploadedQuestions.push({
          questionText: question.questionText,
          questionImageUrl: uploadedQuestionImageUrl,
          videoUrls: uploadedVideoUrls,
        });
      }

      // --- Final Topic Structure ---
      uploadedTopics.push({
        name: topic.name,
        resources: uploadedResources,
        questions: uploadedQuestions,
      });
    }

    const courseData = {
      subject,
      chapter,
      price,
      offerprice,
      chapterImage: chapterImageUrl,
      topics: uploadedTopics,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    };

    try {
      if (editingCourse) {
        await courseRef.update(courseData);
        toast.success("Course updated successfully!");
      } else {
        await courseRef.add(courseData);
        toast.success("Course added successfully!");
      }
    } catch (error) {
      console.error("Firestore operation failed:", error);
      toast.error("An error occurred during save/update.");
    }

    setLoading(false);
    setShowForm(false);
    resetForm();
    fetchCourses();
  };

  // Reset form (Unchanged)
  const resetForm = () => {
    setSubject("");
    setChapter("");
    setPrice("");
    setOfferprice("");
    setTopics([]);
    setEditingCourse(null);
  };

  // Fetch courses from Firestore (Unchanged)
  const fetchCourses = async () => {
    const db = firebase.firestore();
    const snapshot = await db.collection("courses").orderBy("timestamp", "desc").get();
    setCourses(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  };

  // Edit course (Unchanged logic)
  const editCourse = (course) => {
    setEditingCourse(course);
    setSubject(course.subject);
    setChapter(course.chapter);
    setPrice(course.price);
    setOfferprice(course.offerprice);

    const topicsForEdit = course.topics.map(topic => ({
        ...topic,
        resources: topic.resources.map(resource => ({
            title: resource.title,
            resourceType: resource.resourceType,
            files: resource.fileUrls || [],
        })),
        questions: topic.questions?.map(question => ({
            questionText: question.questionText,
            videoFiles: question.videoUrls || [],
            questionImageFile: question.questionImageUrl || null,
        })) || [initialQuestion] 
    }));

    setTopics(topicsForEdit.length > 0 ? topicsForEdit : [{ name: "", resources: [initialResource], questions: [initialQuestion] }]);
    setShowForm(true);
  };

  // Delete course (Unchanged)
  const deleteCourse = async (id) => {
    if (window.confirm("Are you sure you want to delete this course?")) {
      await firebase.firestore().collection("courses").doc(id).delete();
      toast.success("Course deleted successfully!");
      fetchCourses();
    }
  };

  // Toggle course expansion (Unchanged)
  const toggleCourse = (id) => {
    setExpandedCourse(expandedCourse === id ? null : id);
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  // --- UI Components ---

  // Custom Input Field with modern styling
  const ModernInput = ({ label, type = "text", value, onChange, placeholder, icon: Icon }) => (
    <div>
      <label className="block text-gray-700 font-semibold text-sm mb-2 flex items-center">
        {Icon && <Icon className={`mr-2 ${PRIMARY_TEXT_CLASS}`} size={14} />}
        {label}:
      </label>
      <input
        type={type}
        className={`w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 ${PRIMARY_FOCUS_RING} focus:border-[#FF5F1F] transition duration-150 ease-in-out`}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
    </div>
  );

  // Custom Select Field with modern styling
  const ModernSelect = ({ label, value, onChange, options, icon: Icon }) => (
    <div>
      <label className="block text-gray-700 font-semibold text-sm mb-2 flex items-center">
        {Icon && <Icon className={`mr-2 ${PRIMARY_TEXT_CLASS}`} size={14} />}
        {label}:
      </label>
      <select
        className={`w-full h-12 p-3 border border-gray-300 rounded-lg shadow-sm appearance-none bg-white focus:ring-2 ${PRIMARY_FOCUS_RING} focus:border-[#FF5F1F] transition duration-150 ease-in-out`}
        value={value}
        onChange={onChange}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
  
  // Custom File Input Styling
  const CustomFileInput = ({ label, type, multiple, accept, onChange, files, onRemoveFile, icon: Icon, colorClass, helperText }) => (
    <div className="mb-4">
      <label className="block text-sm text-gray-700 font-semibold mb-1 flex items-center">
        {Icon && <Icon className={`mr-1 ${colorClass}`} size={12} />}
        {label}:
      </label>
      <input
        className={`w-full border border-gray-300 p-2 rounded-lg text-sm file:border-0 file:py-2 file:px-4 file:rounded-lg file:mr-3 file:text-white ${colorClass.replace('text-', 'file:bg-')} file:font-semibold transition duration-150 ease-in-out cursor-pointer`}
        type="file"
        multiple={multiple}
        accept={accept}
        onChange={onChange}
      />
      <p className="text-xs text-gray-500 mt-1">{helperText}</p>

      {/* Display selected/existing files */}
      {(files && files.length > 0) && (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-semibold text-gray-600">Selected files:</p>
          {files.map((file, fileIndex) => (
            <div key={fileIndex} className={`flex justify-between items-center ${colorClass.replace('text-', 'bg-').replace('-600', '-50')} px-3 py-1.5 rounded-lg text-xs`}>
              <span className="flex items-center truncate max-w-[80%]">
                {type === 'video' && <FaPlay className={`mr-2 ${colorClass}`} size={10} />}
                {type === 'image' && <FaImage className={`mr-2 ${colorClass}`} size={10} />}
                {type === 'pdf' && <FaBook className={`mr-2 ${colorClass}`} size={10} />}
                {typeof file === 'string' ? file.split('/').pop() : file.name}
              </span>
              <button
                type="button"
                onClick={() => onRemoveFile(fileIndex)}
                className="text-red-500 hover:text-red-700 transition"
                title="Remove File"
              >
                <FaTimes size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );


  // Custom Image File Input Styling (for single image)
  const CustomImageFileInput = ({ label, onChange, file, onRemoveFile, colorClass, helperText, disabled }) => (
    <div className="mb-4">
      <label className="block text-sm text-gray-700 font-semibold mb-1 flex items-center">
        <FaImage className={`mr-1 ${colorClass}`} size={12} />
        {label}:
      </label>
      <input
        className={`w-full border border-gray-300 p-2 rounded-lg text-sm file:border-0 file:py-2 file:px-4 file:rounded-lg file:mr-3 file:text-white ${colorClass.replace('text-', 'file:bg-').replace('-600', '-500')} file:font-semibold transition duration-150 ease-in-out cursor-pointer`}
        type="file"
        accept="image/*"
        onChange={onChange}
        disabled={disabled}
      />
      <p className="text-xs text-gray-500 mt-1">{helperText}</p>

      {/* Display selected/existing file */}
      {(file) && (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-semibold text-gray-600">Selected Image:</p>
          <div className={`flex justify-between items-center ${colorClass.replace('text-', 'bg-').replace('-600', '-50')} px-3 py-1.5 rounded-lg text-xs`}>
            <span className="flex items-center truncate max-w-[80%]">
              <FaImage className={`mr-2 ${colorClass}`} size={10} />
              {typeof file === 'string' 
                  ? decodeURIComponent(file.split('/').pop().split('?')[0]) 
                  : file.name
              }
            </span>
            <button
              type="button"
              onClick={onRemoveFile}
              className="text-red-500 hover:text-red-700 transition"
              title="Remove Image"
            >
              <FaTimes size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      
      {/* --- Floating Add Button --- */}
      <div className="fixed bottom-6 right-6 z-20">
        <button
          className={`${PRIMARY_COLOR_CLASS} text-white px-6 py-4 rounded-full flex items-center space-x-3 shadow-xl hover:shadow-2xl ${PRIMARY_HOVER_CLASS} transition transform hover:scale-105 duration-200 ease-in-out`}
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          <FaPlus size={18} />
          <span className="font-bold text-lg">Add New Course</span>
        </button>
      </div>

      {/* --- Course Management Form Modal --- */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex justify-center items-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-5xl max-h-[95vh] p-8 rounded-2xl shadow-2xl relative overflow-y-auto transform transition-all duration-300 ease-out scale-100">
            <button
              className="absolute top-5 right-5 text-gray-500 hover:text-gray-900 transition"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
            >
              <FaTimes size={28} />
            </button>

            <h2 className={`text-4xl font-extrabold text-center ${PRIMARY_TEXT_CLASS} mb-8`}>
              {editingCourse ? "Update Course" : "Create New Course"}
            </h2>

            {/* General Course Info */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 p-6 border-b border-gray-200">
              <ModernSelect
                label="Subject"
                icon={FaBook}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                options={[
                  { value: "", label: "Select Subject" },
                  { value: "Mechanics", label: "Mechanics" },
                  { value: "Graphics", label: "Graphics" },
                ]}
              />

              <ModernInput
                label="Chapter Name"
                icon={FaBook}
                type="text"
                value={chapter}
                onChange={(e) => setChapter(e.target.value)}
                placeholder="e.g., Kinematics"
              />

              <ModernInput
                label="Original Price (₹)"
                icon={FaMoneyBillWave}
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="999"
              />

              <ModernInput
                label="Offer Price (₹)"
                icon={FaTag}
                type="number"
                value={offerprice}
                onChange={(e) => setOfferprice(e.target.value)}
                placeholder="499"
              />
            </div>

            {/* Topics Management Section */}
            <h3 className="text-2xl font-bold mb-6 text-gray-800 flex items-center">
              <FaBook className={`mr-3 ${PRIMARY_TEXT_CLASS}`} />
              Course Content: Topics & Resources
            </h3>
            
            <div className="space-y-6">
              {topics.map((topic, topicIndex) => (
                <div key={topicIndex} className={`p-6 rounded-xl shadow-md border ${ACCENT_BG_CLASS} transition duration-300 hover:shadow-lg`}>
                  <div className="flex justify-between items-start mb-4 pb-3 border-b border-orange-200">
                    <h4 className={`text-xl font-extrabold ${PRIMARY_TEXT_CLASS}`}>
                      Topic {topicIndex + 1}:
                    </h4>
                    <button
                      className="text-red-500 hover:text-red-700 transition p-2 rounded-full hover:bg-red-100"
                      onClick={() => removeTopic(topicIndex)}
                      title="Remove Topic"
                    >
                      <FaTrash size={16} />
                    </button>
                  </div>

                  {/* Topic Name Input */}
                  <label className="block text-gray-700 font-semibold text-sm mb-2">Topic Title:</label>
                  <input
                    type="text"
                    className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-orange-300 focus:border-[#FF5F1F] mb-6"
                    value={topic.name}
                    onChange={(e) => {
                      const newTopics = [...topics];
                      newTopics[topicIndex].name = e.target.value;
                      setTopics(newTopics);
                    }}
                    placeholder="Enter Topic Name (e.g., Introduction to Motion)"
                  />

                  {/* --- Resources Section --- */}
                  <div className="bg-white p-5 rounded-lg shadow-inner border border-gray-100 mb-6">
                    <h5 className="text-lg font-bold text-gray-800 mb-4 flex items-center border-b pb-2">
                      <FaBook className="mr-2 text-blue-600" />
                      Learning Resources
                    </h5>
                    {topic.resources.map((resource, resourceIndex) => (
                      <div key={resourceIndex} className="p-4 mb-4 border border-blue-200 rounded-lg bg-blue-50">
                        <div className="flex justify-between items-center mb-3">
                          <p className="text-sm font-bold text-blue-700">Resource Group {resourceIndex + 1}</p>
                          {topic.resources.length > 1 && (
                              <button
                                  className="text-red-500 hover:text-red-700 transition p-1"
                                  onClick={() => removeResourceFromTopic(topicIndex, resourceIndex)}
                                  title="Remove Resource Group"
                              >
                                  <FaTrash size={12} />
                              </button>
                          )}
                        </div>

                        {/* Resource Title Input */}
                        <label className="block text-gray-700 text-xs font-semibold mb-1">Group Title:</label>
                        <input
                          type="text"
                          className="w-full p-2 border border-blue-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-400 focus:border-blue-400 mb-3"
                          value={resource.title}
                          onChange={(e) => handleResourceTitleChange(topicIndex, resourceIndex, e.target.value)}
                          placeholder="e.g., 'PDF Notes' or 'Lecture Videos'"
                        />

                        {/* Resource Type Radio Buttons */}
                        <div className="mb-3">
                          <label className="block text-gray-700 text-xs font-semibold mb-2">File Type:</label>
                          <div className="flex space-x-4">
                            <label className="flex items-center text-sm">
                              <input
                                type="radio"
                                name={`resourceType-${topicIndex}-${resourceIndex}`}
                                value="pdf"
                                checked={resource.resourceType === 'pdf'}
                                onChange={() => handleResourceTypeChange(topicIndex, resourceIndex, 'pdf')}
                                className="mr-2 text-blue-600 focus:ring-blue-500"
                              />
                              PDF File (Single)
                            </label>
                            <label className="flex items-center text-sm">
                              <input
                                type="radio"
                                name={`resourceType-${topicIndex}-${resourceIndex}`}
                                value="video"
                                checked={resource.resourceType === 'video'}
                                onChange={() => handleResourceTypeChange(topicIndex, resourceIndex, 'video')}
                                className="mr-2 text-blue-600 focus:ring-blue-500"
                              />
                              Video Files (Multiple)
                            </label>
                          </div>
                        </div>

                        {/* File Input */}
                        <CustomFileInput
                          label={resource.resourceType === 'pdf' ? 'Upload PDF File' : 'Upload Video Files'}
                          type={resource.resourceType}
                          multiple={resource.resourceType === 'video'}
                          accept={resource.resourceType === 'pdf' ? '.pdf' : 'video/*'}
                          onChange={(e) => handleResourceFilesChange(topicIndex, resourceIndex, e.target.files)}
                          files={resource.files}
                          onRemoveFile={(fileIndex) => handleRemoveFileFromResource(topicIndex, resourceIndex, fileIndex)}
                          icon={resource.resourceType === 'pdf' ? FaBook : FaPlay}
                          colorClass="text-blue-600"
                          helperText={resource.resourceType === 'pdf' ? 'Max 1 file.' : 'Hold Ctrl/Cmd to select multiple files.'}
                        />

                      </div>
                    ))}

                    {/* Add Resource Group Button */}
                    <button
                      className="mt-2 text-blue-600 flex items-center hover:text-blue-800 transition text-sm font-semibold p-2 rounded-lg hover:bg-blue-100"
                      onClick={() => addResourceToTopic(topicIndex)}
                    >
                      <FaPlus className="mr-2" size={12} /> Add Another **Resource Group**
                    </button>
                  </div>

                  {/* --- Questions Section --- */}
                  <div className="bg-white p-5 rounded-lg shadow-inner border border-gray-100">
                    <h5 className="text-lg font-bold text-gray-800 mb-4 flex items-center border-b pb-2">
                      <FaQuestionCircle className="mr-2 text-purple-600" />
                      Practice Questions & Solutions
                    </h5>
                    {topic.questions.map((question, questionIndex) => (
                      <div key={questionIndex} className="p-4 mb-4 border border-purple-200 rounded-lg bg-purple-50">
                        <div className="flex justify-between items-center mb-3">
                          <p className="text-sm font-bold text-purple-700">Question {questionIndex + 1}</p>
                          {topic.questions.length > 1 && (
                              <button
                                  className="text-red-500 hover:text-red-700 transition p-1"
                                  onClick={() => removeQuestionFromTopic(topicIndex, questionIndex)}
                                  title="Remove Question"
                              >
                                  <FaTrash size={12} />
                              </button>
                          )}
                        </div>

                        {/* Question Text Input */}
                        <label className="block text-gray-700 text-xs font-semibold mb-1">Question Text/Label:</label>
                        <input
                            type="text"
                            className="w-full p-2 border border-purple-300 rounded-lg text-sm focus:ring-1 focus:ring-purple-400 focus:border-purple-400 mb-4"
                            value={question.questionText}
                            onChange={(e) => handleQuestionTextChange(topicIndex, questionIndex, e.target.value)}
                            placeholder="Enter Question Number or Text Snippet"
                        />
                        
                        {/* Question Image File Input (Single) */}
                        <CustomImageFileInput
                            label="Upload Question Image"
                            onChange={(e) => handleQuestionImageFileChange(topicIndex, questionIndex, e.target.files)}
                            file={question.questionImageFile}
                            onRemoveFile={() => handleRemoveQuestionImageFile(topicIndex, questionIndex)}
                            colorClass="text-pink-600"
                            helperText="Optional: Diagram or Image associated with the question."
                            disabled={question.questionImageFile && typeof question.questionImageFile !== 'string'} 
                        />

                        {/* Video File Input (Multiple) */}
                        <CustomFileInput
                            label="Upload Solution Videos"
                            type="video"
                            multiple
                            accept="video/*"
                            onChange={(e) => handleQuestionVideoFilesChange(topicIndex, questionIndex, e.target.files)}
                            files={question.videoFiles}
                            onRemoveFile={(fileIndex) => handleRemoveVideoFileFromQuestion(topicIndex, questionIndex, fileIndex)}
                            icon={FaPlay}
                            colorClass="text-purple-600"
                            helperText="Select one or more video solutions for this question."
                        />
                      </div>
                    ))}

                    {/* Add Question Button */}
                    <button
                      className="mt-2 text-purple-600 flex items-center hover:text-purple-800 transition text-sm font-semibold p-2 rounded-lg hover:bg-purple-100"
                      onClick={() => addQuestionToTopic(topicIndex)}
                    >
                      <FaPlus className="mr-2" size={12} /> Add Another **Question**
                    </button>
                  </div>

                </div>
              ))}
            </div>
            
            {/* Add Topic Button */}
            <button
              className={`mt-6 ${PRIMARY_TEXT_CLASS} flex items-center hover:text-[#E5551B] transition font-bold text-lg p-3 rounded-xl border border-dashed border-gray-300 hover:border-[#FF5F1F]`}
              onClick={addTopic}
            >
              <FaPlus className="mr-3" /> Add A New Topic Section
            </button>

            {/* Submit Button */}
            <button
              className={`${PRIMARY_COLOR_CLASS} text-white w-full py-4 mt-10 rounded-xl flex justify-center items-center space-x-3 shadow-lg ${PRIMARY_HOVER_CLASS} transition font-bold text-xl`}
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <>
                  <FaUpload className="animate-spin" />
                  <span>{editingCourse ? "Updating" : "Submitting"}... {Math.round(progress)}%</span>
                </>
              ) : (
                <span>{editingCourse ? "Update Course" : "Submit New Course"}</span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* --- Courses List Display --- */}
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-3">📚 Course Catalog</h2>

        {courses.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center border-t-4 border-[#FF5F1F]">
            <p className="text-gray-600 font-medium">No courses found. Click the floating button to add your first course!</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
            {courses.map((course) => (
              <div key={course.id} className="border-b last:border-b-0 group">
                {/* Course Header/Summary */}
                <div
                  className="p-5 flex justify-between items-center cursor-pointer hover:bg-orange-50 transition duration-150 ease-in-out"
                  onClick={() => toggleCourse(course.id)}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-full ${PRIMARY_COLOR_CLASS} text-white`}>
                      <FaBook size={18} />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-xl text-gray-900 group-hover:text-[#FF5F1F] transition">{course.chapter}</h3>
                      <p className="text-gray-600 font-medium">{course.subject}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6">
                    <div className="text-right">
                      <p className="text-gray-500 line-through text-sm">₹{course.price}</p>
                      <p className="font-extrabold text-green-600 text-lg">₹{course.offerprice}</p>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex space-x-2">
                      <button
                        className="p-2 text-blue-600 hover:text-blue-800 transition bg-gray-100 rounded-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          editCourse(course);
                        }}
                        title="Edit Course"
                      >
                        <FaEdit size={16} />
                      </button>
                      <button
                        className="p-2 text-red-600 hover:text-red-800 transition bg-gray-100 rounded-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteCourse(course.id);
                        }}
                        title="Delete Course"
                      >
                        <FaTrash size={16} />
                      </button>
                    </div>

                    {/* Expand Icon */}
                    <span className={`text-gray-400 transition transform ${expandedCourse === course.id ? 'rotate-180 text-[#FF5F1F]' : ''}`}>
                      {expandedCourse === course.id ? <FaChevronUp size={18} /> : <FaChevronDown size={18} />}
                    </span>
                  </div>
                </div>

                {/* Course Details Expansion */}
                {expandedCourse === course.id && (
                  <div className="p-6 bg-gray-100 border-t border-gray-200">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      
                      {/* Course Details Summary */}
                      <div className="lg:col-span-1 bg-white p-5 rounded-xl shadow border border-gray-200 h-fit">
                        <h4 className={`font-extrabold text-lg text-gray-800 mb-4 flex items-center ${PRIMARY_TEXT_CLASS}`}>
                            <FaTag className="mr-2" size={16} /> Details
                        </h4>
                        <div className="space-y-3">
                            <DetailItem label="Subject" value={course.subject} />
                            <DetailItem label="Chapter" value={course.chapter} />
                            <DetailItem label="Original Price" value={`₹${course.price}`} isPrice={true} />
                            <DetailItem label="Offer Price" value={`₹${course.offerprice}`} isPrice={true} isOffer={true} />
                        </div>
                      </div>

                      {/* Topics Content List */}
                      <div className="lg:col-span-2 space-y-5">
                          <h4 className={`font-extrabold text-lg text-gray-800 mb-4 flex items-center ${PRIMARY_TEXT_CLASS}`}>
                            <FaBook className="mr-2" size={16} /> Topics Content
                          </h4>
                          {course.topics.map((topic, topicIndex) => (
                            <div key={topicIndex} className="bg-white p-4 rounded-xl shadow-md border border-gray-200">
                              <h5 className="font-bold text-gray-800 mb-3 flex items-center">
                                <span className={`font-extrabold mr-2 ${PRIMARY_TEXT_CLASS}`}>{topicIndex + 1}.</span> {topic.name}
                              </h5>
                              
                              {/* Resources Display */}
                              <h6 className="font-bold text-sm text-blue-700 mt-4 mb-2 pl-3 border-l-4 border-blue-400">Resources:</h6>
                              <div className="flex flex-col gap-2 pl-7">
                                {topic.resources.map((resource, resourceIndex) => (
                                  <div key={resourceIndex} className="text-sm">
                                    <p className="font-medium text-gray-700">
                                      {resource.title}
                                      <span className="text-xs text-gray-500 ml-2">
                                        ({resource.resourceType.toUpperCase()} - {resource.fileUrls.length} files)
                                      </span>
                                    </p>
                                    <div className="flex flex-wrap gap-2 ml-2 mt-1">
                                      {resource.fileUrls.map((fileUrl, fileIndex) => (
                                        <a
                                          key={fileIndex}
                                          href={fileUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className={`text-xs ${resource.resourceType === 'video' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-700'} px-2 py-1 rounded-full hover:shadow-md flex items-center transition`}
                                          title={resource.resourceType === 'video' ? `Video Solution ${fileIndex + 1}` : 'Download PDF'}
                                        >
                                          {resource.resourceType === 'video' ? <FaPlay className="mr-1" size={8} /> : <FaBook className="mr-1" size={8} />}
                                          {resource.resourceType === 'video' ? `Video ${fileIndex + 1}` : 'File Link'}
                                        </a>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>

                              {/* Questions Display */}
                              <h6 className="font-bold text-sm text-purple-700 mt-4 mb-2 pl-3 border-l-4 border-purple-400">Questions:</h6>
                              <div className="flex flex-col gap-3 pl-7">
                                {topic.questions?.map((question, questionIndex) => (
                                    <div key={questionIndex} className="text-sm border-b border-purple-100 pb-2">
                                        <p className="font-medium text-purple-700">
                                            Q{questionIndex + 1}: <span className="text-gray-800">{question.questionText}</span>
                                        </p>
                                        
                                        <div className="flex flex-wrap gap-2 mt-1 ml-2">
                                            {question.questionImageUrl && (
                                                <a
                                                    href={question.questionImageUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs bg-pink-100 text-pink-700 px-2 py-1 rounded-full hover:shadow-md flex items-center transition"
                                                    title="View Question Image"
                                                >
                                                    <FaImage className="mr-1" size={8} /> View Image
                                                </a>
                                            )}

                                            {question.videoUrls.map((videoUrl, videoIndex) => (
                                                <a
                                                    key={videoIndex}
                                                    href={videoUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full hover:shadow-md flex items-center transition"
                                                    title={`Video Solution ${videoIndex + 1}`}
                                                >
                                                    <FaPlay className="mr-1" size={8} />
                                                    Solution {videoIndex + 1}
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                              </div>
                            </div>
                          ))}
                      </div>

                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <ToastContainer position="bottom-right" autoClose={3000} />
    </div>
  );
};

// Helper component for displaying details in the list view
const DetailItem = ({ label, value, isPrice, isOffer }) => (
    <div className="flex justify-between items-center border-b border-gray-100 pb-2">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        {isPrice ? (
            <span className={`font-semibold ${isOffer ? 'text-green-600 text-lg' : 'text-gray-800 text-base'}`}>
                {value}
            </span>
        ) : (
            <span className="font-semibold text-gray-800">{value}</span>
        )}
    </div>
);


export default Course;