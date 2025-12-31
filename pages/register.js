import React, { useState, useEffect, useRef } from "react";
import { useRouter } from 'next/router';
import { firebase } from '../Firebase/config';
import 'firebase/auth';
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import Modal from 'react-modal';
import { FiUser, FiMail, FiPhone, FiCalendar, FiBook, FiUpload, FiCheckCircle, FiArrowLeft, FiCreditCard, FiDollarSign, FiShare2, FiCopy, FiTarget } from 'react-icons/fi';
import { FaUniversity, FaWhatsapp, FaIdCard, FaGraduationCap } from 'react-icons/fa';

Modal.setAppElement('#__next');

const Signinsinup = () => {
  const router = useRouter();
  const { ref } = router.query; // Get referral ID from URL
  const [user, setUser] = useState(null);
  const [otp, setOtp] = useState("");
  const [ph, setPh] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [step, setStep] = useState(1);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [generatedOTP, setGeneratedOTP] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [showReferralInfo, setShowReferralInfo] = useState(false);
  const [referralId, setReferralId] = useState("");
  const [referralLink, setReferralLink] = useState("");
  
  // Registration form states
  const [registrationData, setRegistrationData] = useState({
    name: "",
    collegeName: "",
    branchName: "",
    callingNumber: "",
    whatsappNumber: "",
    email: "",
    dateOfBirth: "",
    collegeIdCard: null,
    collegeIdCardPreview: "",
    profileImage: null,
    profileImagePreview: "",
    referredBy: "" // Store referral ID
  });

  const fileInputRef = useRef(null);
  const idCardInputRef = useRef(null);

  useEffect(() => {
    // Check for referral ID in URL
    if (ref) {
      setReferralId(ref);
      setRegistrationData(prev => ({
        ...prev,
        referredBy: ref
      }));
      setShowReferralInfo(true);
      toast.success(`Welcome! You were referred by user: ${ref.substring(0, 8)}...`);
    }

    const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        setUser(user.uid);
        // Generate referral link for current user
        generateReferralLink(user.uid);
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, [ref]);

  // Generate referral link for current user
  const generateReferralLink = (userId) => {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/register?ref=${userId}`;
    setReferralLink(link);
  };

  // Function to load Razorpay script dynamically
  const loadRazorpayScript = async () => {
    try {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
      });
      return true;
    } catch (error) {
      console.error('Error loading Razorpay script:', error);
      toast.error('Failed to load payment gateway. Please try again.');
      return false;
    }
  };

  // Generate random OTP for course access
  const generateRandomOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  // Calculate dates for course
  const calculateCourseDates = () => {
    const joiningDate = new Date();
    const expiryDate = new Date();
    expiryDate.setMonth(joiningDate.getMonth() + 6); // 6 months from joining
    
    return {
      joiningDate: joiningDate.toISOString(),
      expiryDate: expiryDate.toISOString(),
      paymentDate: new Date().toISOString()
    };
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setRegistrationData({
      ...registrationData,
      [name]: value
    });
  };

  const handleProfileImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Profile image should be less than 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setRegistrationData({
          ...registrationData,
          profileImage: file,
          profileImagePreview: reader.result
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleIdCardChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("ID card should be less than 10MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setRegistrationData({
          ...registrationData,
          collegeIdCard: file,
          collegeIdCardPreview: reader.result
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeProfileImage = () => {
    setRegistrationData({
      ...registrationData,
      profileImage: null,
      profileImagePreview: ""
    });
  };

  const removeIdCard = () => {
    setRegistrationData({
      ...registrationData,
      collegeIdCard: null,
      collegeIdCardPreview: ""
    });
  };

  // Copy referral link to clipboard
  const copyReferralLink = () => {
    if (referralLink) {
      navigator.clipboard.writeText(referralLink)
        .then(() => {
          toast.success("Referral link copied to clipboard!");
        })
        .catch(err => {
          console.error('Failed to copy: ', err);
          toast.error("Failed to copy link");
        });
    }
  };

  function onSignup() {
    if (!ph) {
      toast.error("Please enter phone number");
      return;
    }
    setLoading(true);

    const appVerifier = new firebase.auth.RecaptchaVerifier(
      "recaptcha-container",
      {
        size: "invisible",
        callback: (response) => {
          signIn();
        },
        "expired-callback": () => {},
      }
    );

    const formatPh = "+" + ph;

    firebase.auth().signInWithPhoneNumber(formatPh, appVerifier)
      .then((confirmationResult) => {
        window.confirmationResult = confirmationResult;
        setLoading(false);
        setShowOTP(true);
        toast.success("OTP sent successfully!");
      })
      .catch((error) => {
        console.log(error);
        setLoading(false);
        toast.error("Error sending OTP. Please try again.");
      });
  }

  function onOTPVerify() {
    if (!otp) {
      toast.error("Please enter OTP");
      return;
    }
    
    setLoading(true);
    window.confirmationResult
      .confirm(otp)
      .then(async (res) => {
        setLoading(false);
        toast.success("Phone number verified successfully!");
        setStep(2);
        // Generate referral link for the new user
        if (res.user) {
          generateReferralLink(res.user.uid);
        }
      })
      .catch((err) => {
        console.error("Error verifying OTP:", err);
        setLoading(false);
        toast.error("Invalid verification code. Please try again.");
      });
  }

  const validateRegistrationData = () => {
    const { 
      name, 
      collegeName, 
      branchName, 
      callingNumber, 
      whatsappNumber, 
      email, 
      dateOfBirth 
    } = registrationData;

    if (!name.trim()) {
      toast.error("Please enter your name");
      return false;
    }
    if (!collegeName.trim()) {
      toast.error("Please enter college name");
      return false;
    }
    if (!branchName.trim()) {
      toast.error("Please enter branch name");
      return false;
    }
    if (!ph.trim()) {
      toast.error("Please enter calling number");
      return false;
    }
    if (!whatsappNumber.trim()) {
      toast.error("Please enter WhatsApp number");
      return false;
    }
    if (!email.trim()) {
      toast.error("Please enter email");
      return false;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      toast.error("Please enter a valid email address");
      return false;
    }
    if (!dateOfBirth) {
      toast.error("Please select date of birth");
      return false;
    }
    if (!registrationData.collegeIdCard) {
      toast.error("Please upload college ID card");
      return false;
    }

    return true;
  };

  const uploadFileToStorage = async (file, path) => {
    try {
      const storageRef = firebase.storage().ref();
      const fileRef = storageRef.child(path);
      await fileRef.put(file);
      const downloadURL = await fileRef.getDownloadURL();
      return downloadURL;
    } catch (error) {
      console.error("Error uploading file:", error);
      throw error;
    }
  };

  // Update referral data for referrer
  const updateReferrerData = async (newUserId, newUserName) => {
    try {
      if (!referralId) return; // No referrer

      const referrerRef = firebase.firestore().collection("Users").doc(referralId);
      const referrerDoc = await referrerRef.get();
      
      if (referrerDoc.exists) {
        // Update referrer's data
        await referrerRef.update({
          referrals: firebase.firestore.FieldValue.arrayUnion({
            userId: newUserId,
            userName: newUserName,
            referralDate: new Date().toISOString(),
            status: "pending", // Will be updated when payment is made
          }),
          totalReferrals: firebase.firestore.FieldValue.increment(1)
        });
        
        // Also update referral earnings when payment is successful
        const referralEarning = {
          referredUserId: newUserId,
          referredUserName: newUserName,
          amount: 50, // ₹50 cashback
          status: "pending",
          referralDate: new Date().toISOString(),
          paymentDate: null
        };
        
        await firebase.firestore().collection("ReferralEarnings").add({
          ...referralEarning,
          referrerId: referralId,
          referrerName: referrerDoc.data().name || "Unknown"
        });
        
        console.log("Referrer data updated successfully");
      }
    } catch (error) {
      console.error("Error updating referrer data:", error);
    }
  };

  // Initialize Razorpay payment
  const initiatePayment = async () => {
    if (!validateRegistrationData()) {
      return;
    }

    setLoading(true);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setLoading(false);
        return;
      }

      const amountInPaise = 1199 * 100; // ₹1199 in paise
      const dates = calculateCourseDates();
      const randomOTP = generateRandomOTP();
      setGeneratedOTP(randomOTP);

      const options = {
        key: 'rzp_test_td8CxckGpxFssp', // Your Razorpay key
        amount: amountInPaise,
        currency: 'INR',
        name: 'Atut',
        description: 'Course Enrollment - Atut',
        image: '/logo.png',
        handler: async function (response) {
          try {
            // Payment successful - save all data
            await handleSuccessfulPayment(response, randomOTP, dates);
          } catch (error) {
            console.error('Error handling payment success:', error);
            toast.error('Failed to save payment details. Please contact support.');
          }
        },
        prefill: {
          name: registrationData.name,
          email: registrationData.email,
          contact: registrationData.callingNumber
        },
        notes: {
          address: registrationData.collegeName,
          branch: registrationData.branchName
        },
        theme: {
          color: '#F37254'
        }
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
      
    } catch (error) {
      console.error('Error initiating payment:', error);
      toast.error('Failed to initiate payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle successful payment and save data
  const handleSuccessfulPayment = async (paymentResponse, randomOTP, dates) => {
    setLoading(true);
    try {
      const user = firebase.auth().currentUser;
      if (!user) {
        throw new Error("User not authenticated");
      }

      let profileImageUrl = "";
      let idCardUrl = "";

      // Upload files if they exist
      if (registrationData.profileImage) {
        const profilePath = `users/${user.uid}/profile/${Date.now()}_${registrationData.profileImage.name}`;
        profileImageUrl = await uploadFileToStorage(registrationData.profileImage, profilePath);
      }

      if (registrationData.collegeIdCard) {
        const idCardPath = `users/${user.uid}/idcards/${Date.now()}_${registrationData.collegeIdCard.name}`;
        idCardUrl = await uploadFileToStorage(registrationData.collegeIdCard, idCardPath);
      }

      // Create payment data array
      const paymentData = {
        courseName: "Mechanics",
        amount: 1199,
        paymentId: paymentResponse.razorpay_payment_id,
        orderId: paymentResponse.razorpay_order_id || `order_${Date.now()}`,
        paymentDate: dates.paymentDate,
        joiningDate: dates.joiningDate,
        expiryDate: dates.expiryDate,
        courseAccessOTP: randomOTP,
        status: "completed",
        Login:'False',
      };

      // Save user data to Firestore
      const userRef = firebase.firestore().collection("Users").doc(user.uid);
      
      const userData = {
        mobile: ph,
        mobileVerification: true,
        Role: "Student",
        Uid: user.uid,
        name: registrationData.name,
        collegeName: registrationData.collegeName,
        branchName: registrationData.branchName,
        callingNumber: registrationData.callingNumber,
        whatsappNumber: registrationData.whatsappNumber,
        email: registrationData.email,
        dateOfBirth: registrationData.dateOfBirth,
        profileImage: profileImageUrl,
        collegeIdCard: idCardUrl,
        Login:'False',
        registrationDate: new Date().toISOString(),
        isProfileComplete: true,
        registeredForAtut: true,
        courseAccessOTP: randomOTP,
        courseDetails: {
          name: "Mechanics",
          joiningDate: dates.joiningDate,
          expiryDate: dates.expiryDate,
          status: "active"
        },
        payments: firebase.firestore.FieldValue.arrayUnion(paymentData)
      };

      // Add referral data if available
      if (referralId) {
        userData.referredBy = referralId;
        userData.referralDate = new Date().toISOString();
        userData.referralStatus = "completed";
        userData.amount = "50";
      }

      await userRef.set(userData, { merge: true });

      // Update referrer's data if this user was referred
      if (referralId) {
        await updateReferrerData(user.uid, registrationData.name);
      }

      // Also save to separate payments collection
      await firebase.firestore().collection("CoursesPurchase").add({
        ...paymentData,
        studentName: registrationData.name,
        studentId: user.uid,
        mobile: ph,
        email: registrationData.email,
        collegeName: registrationData.collegeName,
        branchName: registrationData.branchName,
        referredBy: referralId || null
      });

      setPaymentStatus("success");
      setShowSuccessModal(true);
      
      // Show referral link for the new user
      if (user.uid) {
        generateReferralLink(user.uid);
      }
      
      toast.success("Payment successful! Your course enrollment is complete.");

    } catch (error) {
      console.error("Error during registration and payment:", error);
      setPaymentStatus("error");
      toast.error("Error completing registration. Please contact support.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-r from-orange-600 to-orange-500 rounded-lg flex items-center justify-center">
              <img src="/logo.png" className="w-30 h-30 object-contain" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Atut</h1>
              <p className="text-orange-300 text-sm">Student Registration Portal</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Side - Course Info & Benefits */}
          <div className="lg:w-2/5 space-y-6">
            {/* Course Overview Card */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-gray-700 shadow-2xl">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-orange-600 to-orange-500 rounded-lg flex items-center justify-center mr-3">
                  <FaGraduationCap className="text-white text-xl" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Atut</h2>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="px-2 py-1 bg-orange-600 text-white rounded-full text-xs font-medium">
                      Industry Certified
                    </span>
                    <span className="px-2 py-1 bg-blue-600 text-white rounded-full text-xs font-medium">
                      Beginner to Advanced
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-600/20 to-orange-500/20 rounded-xl border border-orange-500/30">
                  <div>
                    <h3 className="font-bold text-white">Course Price</h3>
                    <p className="text-gray-300 text-sm">One-time payment</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-white">₹1,199</div>
                    <p className="text-green-400 text-sm">Inclusive of all taxes</p>
                  </div>
                </div>
                
                <p className="text-gray-300">
                  A comprehensive training program designed to equip students with 
                  industry-relevant skills through both theoretical concepts and practical implementation.
                </p>
                
                <div>
                  <h3 className="font-bold text-white mb-2">Course Highlights:</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <div className="w-5 h-5 bg-orange-600 rounded-full flex items-center justify-center mt-0.5 mr-2 flex-shrink-0">
                        <FiCheckCircle className="text-white text-xs" />
                      </div>
                      <span className="text-gray-300 text-sm">Complete project-based learning</span>
                    </li>
                    <li className="flex items-start">
                      <div className="w-5 h-5 bg-orange-600 rounded-full flex items-center justify-center mt-0.5 mr-2 flex-shrink-0">
                        <FiCheckCircle className="text-white text-xs" />
                      </div>
                      <span className="text-gray-300 text-sm">Industry expert mentorship</span>
                    </li>
                    <li className="flex items-start">
                      <div className="w-5 h-5 bg-orange-600 rounded-full flex items-center justify-center mt=0.5 mr-2 flex-shrink-0">
                        <FiCheckCircle className="text-white text-xs" />
                      </div>
                      <span className="text-gray-300 text-sm">Career guidance & placement assistance</span>
                    </li>
                    <li className="flex items-start">
                      <div className="w-5 h-5 bg-orange-600 rounded-full flex items-center justify-center mt-0.5 mr-2 flex-shrink-0">
                        <FiCheckCircle className="text-white text-xs" />
                      </div>
                      <span className="text-gray-300 text-sm">Certificate of completion</span>
                    </li>
                    <li className="flex items-start">
                      <div className="w-5 h-5 bg-orange-600 rounded-full flex items-center justify-center mt-0.5 mr-2 flex-shrink-0">
                        <FiCheckCircle className="text-white text-xs" />
                      </div>
                      <span className="text-gray-300 text-sm">6 months access</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Referral Info Card - Only show after verification */}
            {/* {step === 2 && (
              <div className="bg-gradient-to-br from-purple-800 to-purple-900 rounded-2xl p-6 border border-purple-700 shadow-2xl">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-purple-500 rounded-lg flex items-center justify-center mr-3">
                    <FiShare2 className="text-white text-xl" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Refer & Earn</h2>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="px-2 py-1 bg-green-600 text-white rounded-full text-xs font-medium">
                        ₹50 Cashback
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <p className="text-gray-300 text-sm">
                    Share your referral link with friends and earn ₹50 when they enroll!
                  </p>
                  
                  {referralLink && (
                    <div className="space-y-3">
                      <label className="block text-gray-300 text-sm font-medium">Your Referral Link:</label>
                      <div className="flex items-center bg-gray-700 rounded-xl p-3 border border-gray-600">
                        <input
                          type="text"
                          value={referralLink}
                          readOnly
                          className="flex-1 bg-transparent text-white text-sm truncate focus:outline-none"
                        />
                        <button
                          onClick={copyReferralLink}
                          className="ml-2 px-3 py-1 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-lg text-sm hover:from-purple-700 hover:to-purple-600 transition-all flex items-center"
                        >
                          <FiCopy className="mr-1" />
                          Copy
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {showReferralInfo && referralId && (
                    <div className="bg-gradient-to-r from-green-600/20 to-green-500/20 rounded-xl p-4 border border-green-500/30">
                      <p className="text-green-400 text-sm font-medium">🎉 Referral Applied!</p>
                      <p className="text-gray-300 text-sm mt-1">
                        You were referred by: <span className="font-bold">{referralId.substring(0, 8)}...</span>
                      </p>
                    </div>
                  )}
                  
                  <div className="bg-gray-700/50 rounded-xl p-4">
                    <h4 className="font-bold text-white text-sm mb-2">How it works:</h4>
                    <ul className="text-gray-300 text-xs space-y-1">
                      <li className="flex items-start">
                        <div className="w-4 h-4 bg-purple-600 rounded-full flex items-center justify-center mt-0.5 mr-2 flex-shrink-0">
                          <FiCheckCircle className="text-white text-xs" />
                        </div>
                        <span>Share your unique referral link</span>
                      </li>
                      <li className="flex items-start">
                        <div className="w-4 h-4 bg-purple-600 rounded-full flex items-center justify-center mt-0.5 mr-2 flex-shrink-0">
                          <FiCheckCircle className="text-white text-xs" />
                        </div>
                        <span>Friend registers using your link</span>
                      </li>
                      <li className="flex items-start">
                        <div className="w-4 h-4 bg-purple-600 rounded-full flex items-center justify-center mt-0.5 mr-2 flex-shrink-0">
                          <FiCheckCircle className="text-white text-xs" />
                        </div>
                        <span>You earn ₹50 when they complete payment</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )} */}

            {/* How It Works */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-gray-700 shadow-2xl">
              <h2 className="text-xl font-bold text-white mb-4">How To Enroll in Atut Course</h2>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white font-bold text-sm">1</span>
                  </div>
                  <div className="ml-4">
                    <h4 className="font-bold text-white text-sm">Phone Verification</h4>
                    <p className="text-gray-400 text-sm">Verify your mobile number with OTP</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white font-bold text-sm">2</span>
                  </div>
                  <div className="ml-4">
                    <h4 className="font-bold text-white text-sm">Complete Profile</h4>
                    <p className="text-gray-400 text-sm">Fill in your personal and college details</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white font-bold text-sm">3</span>
                  </div>
                  <div className="ml-4">
                    <h4 className="font-bold text-white text-sm">Make Payment</h4>
                    <p className="text-gray-400 text-sm">Pay ₹1,199 via Razorpay gateway</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white font-bold text-sm">4</span>
                  </div>
                  <div className="ml-4">
                    <h4 className="font-bold text-white text-sm">Get Access</h4>
                    <p className="text-gray-400 text-sm">Receive course access OTP instantly</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Card */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-gray-700 shadow-2xl">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                <FiCheckCircle className="mr-2 text-orange-500" />
                Registration Progress
              </h2>
              <div className="space-y-4">
                <div className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-orange-600 text-white' : 'bg-gray-700 text-gray-400'}`}>
                    1
                  </div>
                  <div className="ml-4">
                    <p className="font-medium text-white">Phone Verification</p>
                    <p className="text-sm text-gray-400">Verify your mobile number</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-orange-600 text-white' : 'bg-gray-700 text-gray-400'}`}>
                    2
                  </div>
                  <div className="ml-4">
                    <p className="font-medium text-white">Profile Details</p>
                    <p className="text-sm text-gray-400">Complete your information</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Form */}
          <div className="lg:w-3/5">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 border border-gray-700 shadow-2xl">
              {step === 1 ? (
                <div className="space-y-6">
                  <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-white mb-2">Get Started</h2>
                    <p className="text-gray-400">Verify your phone number to begin your Atut journey</p>
                  </div>
                  
                  <div id="recaptcha-container" className="hidden"></div>
                  
                  {showOTP ? (
                    <div className="space-y-6">
                      <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-gradient-to-r from-orange-600 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                          <FiPhone className="text-white text-2xl" />
                        </div>
                        <h3 className="text-xl font-bold text-white">Enter Verification Code</h3>
                        <p className="text-gray-400 mt-2">We sent a 6-digit code to +{ph}</p>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex justify-center">
                          <div className="w-full max-w-xs">
                            <input
                              type="text"
                              value={otp}
                              onChange={(e) => setOtp(e.target.value)}
                              placeholder="Enter 6-digit OTP"
                              className="w-full px-6 py-4 rounded-xl bg-gray-700 border-2 border-gray-600 text-white text-center text-xl tracking-widest focus:border-orange-500 focus:outline-none transition-all"
                              maxLength="6"
                            />
                          </div>
                        </div>
                        
                        <button
                          onClick={onOTPVerify}
                          disabled={loading}
                          className="w-full py-4 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl font-semibold hover:from-orange-700 hover:to-orange-600 transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-orange-500/25 flex items-center justify-center"
                        >
                          {loading ? (
                            <>
                              <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Verifying...
                            </>
                          ) : (
                            <>
                              <FiCheckCircle className="mr-2" />
                              Verify & Continue
                            </>
                          )}
                        </button>
                        
                        <button
                          onClick={() => {
                            setShowOTP(false);
                            setOtp("");
                          }}
                          className="text-orange-400 hover:text-orange-300 text-sm font-medium flex items-center justify-center mx-auto"
                        >
                          <FiArrowLeft className="mr-2" />
                          Change Phone Number
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-gradient-to-r from-orange-600 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                          <FiPhone className="text-white text-2xl" />
                        </div>
                        <h3 className="text-xl font-bold text-white">Enter Your Phone Number</h3>
                        <p className="text-gray-400 mt-2">We'll send a verification code</p>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="bg-gray-700 rounded-xl p-4">
                          <PhoneInput
                            country={"in"}
                            value={ph}
                            onChange={setPh}
                            inputClass="w-full bg-transparent text-white"
                            containerClass="w-full"
                            inputStyle={{ 
                              width: '100%', 
                              height: '20px',
                              background: 'transparent',
                              border: 'none',
                              fontSize: '16px',
                              color: 'white'
                            }}
                            buttonStyle={{ background: 'transparent', border: 'none' }}
                          />
                        </div>
                        
                        <button
                          onClick={onSignup}
                          disabled={loading}
                          className="w-full py-4 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl font-semibold hover:from-orange-700 hover:to-orange-600 transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-orange-500/25 flex items-center justify-center"
                        >
                          {loading ? (
                            <>
                              <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Sending OTP...
                            </>
                          ) : (
                            <>
                              <FiPhone className="mr-2" />
                              Send Verification Code
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="text-center mb-6">
                    <h2 className="text-3xl font-bold text-white mb-2">Complete Your Profile</h2>
                    <p className="text-gray-400">Fill in your details to enroll in Atut course (₹1,199)</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Personal Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-bold text-white flex items-center">
                        <FiUser className="mr-2 text-orange-500" />
                        Personal Information
                      </h3>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-gray-300 text-sm mb-2 font-medium">Full Name *</label>
                          <div className="relative">
                            <FiUser className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" />
                            <input
                              type="text"
                              name="name"
                              value={registrationData.name}
                              onChange={handleInputChange}
                              placeholder="Enter your full name"
                              className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-700 border border-gray-600 text-white focus:border-orange-500 focus:outline-none transition-all"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-gray-300 text-sm mb-2 font-medium">Email ID *</label>
                          <div className="relative">
                            <FiMail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" />
                            <input
                              type="email"
                              name="email"
                              value={registrationData.email}
                              onChange={handleInputChange}
                              placeholder="your.email@example.com"
                              className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-700 border border-gray-600 text-white focus:border-orange-500 focus:outline-none transition-all"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-gray-300 text-sm mb-2 font-medium">Reffered By</label>
                          <div className="relative">
                            <FiTarget className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" />
                            <input
                              value={referralId}
                        readOnly
                              className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-700 border border-gray-600 text-white focus:border-orange-500 focus:outline-none transition-all"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-gray-300 text-sm mb-2 font-medium">Date of Birth *</label>
                          <div className="relative">
                            <FiCalendar className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" />
                            <input
                              type="date"
                              name="dateOfBirth"
                              value={registrationData.dateOfBirth}
                              onChange={handleInputChange}
                              className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-700 border border-gray-600 text-white focus:border-orange-500 focus:outline-none transition-all"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-gray-300 text-sm mb-2 font-medium">Profile Image (Optional)</label>
                          <div className="flex items-center space-x-4">
                            <button
                              onClick={() => fileInputRef.current.click()}
                              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition-all flex items-center"
                            >
                              <FiUpload className="mr-2" />
                              Choose File
                            </button>
                            <input
                              type="file"
                              ref={fileInputRef}
                              onChange={handleProfileImageChange}
                              accept="image/*"
                              className="hidden"
                            />
                            {registrationData.profileImagePreview && (
                              <div className="relative group">
                                <img
                                  src={registrationData.profileImagePreview}
                                  alt="Profile Preview"
                                  className="w-14 h-14 rounded-full object-cover border-2 border-orange-500"
                                />
                                <button
                                  onClick={removeProfileImage}
                                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  ×
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* College Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-bold text-white flex items-center">
                        <FaUniversity className="mr-2 text-orange-500" />
                        College Information
                      </h3>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-gray-300 text-sm mb-2 font-medium">College Name *</label>
                          <div className="relative">
                            <FaUniversity className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" />
                            <input
                              type="text"
                              name="collegeName"
                              value={registrationData.collegeName}
                              onChange={handleInputChange}
                              placeholder="Enter college name"
                              className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-700 border border-gray-600 text-white focus:border-orange-500 focus:outline-none transition-all"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-gray-300 text-sm mb-2 font-medium">Branch Name *</label>
                          <div className="relative">
                            <FiBook className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" />
                            <input
                              type="text"
                              name="branchName"
                              value={registrationData.branchName}
                              onChange={handleInputChange}
                              placeholder="Enter branch name"
                              className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-700 border border-gray-600 text-white focus:border-orange-500 focus:outline-none transition-all"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-gray-300 text-sm mb-2 font-medium">Calling Number *</label>
                          <div className="relative">
                            <FiPhone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" />
                            <input
                              type="tel"
                              name="callingNumber"
                              value={ph}
                              onChange={handleInputChange}
                              placeholder="Enter calling number"
                              readOnly
                              className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-700 border border-gray-600 text-white focus:border-orange-500 focus:outline-none transition-all"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-gray-300 text-sm mb-2 font-medium">WhatsApp Number *</label>
                          <div className="relative">
                            <FaWhatsapp className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" />
                            <input
                              type="tel"
                              name="whatsappNumber"
                              value={registrationData.whatsappNumber}
                              onChange={handleInputChange}
                              placeholder="Enter WhatsApp number"
                              className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-700 border border-gray-600 text-white focus:border-orange-500 focus:outline-none transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ID Card Upload */}
                  <div className="pt-6 border-t border-gray-700">
                    <h3 className="text-lg font-bold text-white flex items-center mb-4">
                      <FaIdCard className="mr-2 text-orange-500" />
                      College ID Verification
                    </h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-center space-x-4">
                        <button
                          onClick={() => idCardInputRef.current.click()}
                          className="px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white rounded-xl font-medium transition-all flex items-center shadow-lg hover:shadow-orange-500/25"
                        >
                          <FiUpload className="mr-2" />
                          Upload College ID Card
                        </button>
                        <input
                          type="file"
                          ref={idCardInputRef}
                          onChange={handleIdCardChange}
                          accept="image/*,.pdf"
                          className="hidden"
                        />
                        
                        {registrationData.collegeIdCard && (
                          <div className="flex-1 flex items-center justify-between bg-gray-700 rounded-xl px-4 py-3">
                            <div className="flex items-center space-x-3">
                              <FiCreditCard className="text-orange-500" />
                              <div>
                                <p className="text-white font-medium text-xs">{registrationData.collegeIdCard.name}</p>
                                <p className="text-gray-400 text-sm">
                                  {(registrationData.collegeIdCard.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={removeIdCard}
                              className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm transition-all"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                      
                      <p className="text-gray-400 text-sm">
                        Upload a clear image or PDF of your college ID card (Max 10MB). This is required for verification.
                      </p>
                      
                      {registrationData.collegeIdCardPreview && 
                       registrationData.collegeIdCard.type?.startsWith('image/') && (
                        <div className="mt-4">
                          <p className="text-gray-300 text-sm mb-2">Preview:</p>
                          <div className="relative max-w-md">
                            <img
                              src={registrationData.collegeIdCardPreview}
                              alt="ID Card Preview"
                              className="rounded-xl border-2 border-gray-600 max-h-64 object-contain w-96"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Pay and Submit Button */}
                  <div className="pt-6 border-t border-gray-700">
                    <button
                      onClick={initiatePayment}
                      disabled={loading}
                      className="w-full py-4 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl font-bold hover:from-green-700 hover:to-green-600 transition-all duration-300 transform hover:scale-[1.02] shadow-xl hover:shadow-green-500/30 flex items-center justify-center text-lg"
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing...
                        </>
                      ) : (
                        <>
                          Pay ₹1,199 & Enroll Now
                        </>
                      )}
                    </button>
                    
                    <p className="text-gray-400 text-sm text-center mt-4">
                      By enrolling, you agree to our Terms of Service and Privacy Policy
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      <Modal
        isOpen={showSuccessModal}
        onRequestClose={() => setShowSuccessModal(false)}
        contentLabel="Registration Successful"
        className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 max-w-2xl mx-auto mt-20 border border-gray-700 shadow-2xl"
        overlayClassName="fixed inset-0 bg-black bg-opacity-75 backdrop-blur-sm flex items-center justify-center"
      >
        <div className="text-center space-y-6">
          <div className="w-20 h-20 bg-gradient-to-r from-green-600 to-green-500 rounded-full flex items-center justify-center mx-auto animate-pulse">
            <FiCheckCircle className="text-white text-3xl" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">🎉 Congratulations!</h2>
            <p className="text-gray-300">Your registration and payment are complete!</p>
          </div>
          
          <div className="bg-gradient-to-r from-green-600/20 to-green-500/20 rounded-xl p-6 border border-green-500/30">
            <h3 className="text-xl font-bold text-white mb-4">Course Access Details</h3>
            
            <div className="space-y-4">
              <div className="bg-gray-700/50 rounded-xl p-4">
                <p className="text-gray-300 text-sm mb-2">Course Access OTP</p>
                <div className="text-3xl font-bold text-white tracking-widest bg-gray-800 py-3 rounded-lg">
                  {generatedOTP}
                </div>
                <p className="text-gray-400 text-sm mt-2">
                  This OTP is required to access your course materials. Save it securely!
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-700/50 rounded-xl p-4">
                  <p className="text-gray-300 text-sm">Course</p>
                  <p className="text-white font-bold">Mechanics</p>
                </div>
                <div className="bg-gray-700/50 rounded-xl p-4">
                  <p className="text-gray-300 text-sm">Amount Paid</p>
                  <p className="text-white font-bold">₹1,199</p>
                </div>
                <div className="bg-gray-700/50 rounded-xl p-4">
                  <p className="text-gray-300 text-sm">Joining Date</p>
                  <p className="text-white font-bold">
                    {new Date().toLocaleDateString('en-IN')}
                  </p>
                </div>
                <div className="bg-gray-700/50 rounded-xl p-4">
                  <p className="text-gray-300 text-sm">Valid Until</p>
                  <p className="text-white font-bold">
                    {new Date(new Date().setMonth(new Date().getMonth() + 6)).toLocaleDateString('en-IN')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Referral Section in Success Modal */}
          {referralLink && (
            <div className="bg-gradient-to-r from-purple-600/20 to-purple-500/20 rounded-xl p-6 border border-purple-500/30">
              <h3 className="text-xl font-bold text-white mb-4">🌟 Your Referral Link</h3>
              <div className="space-y-4">
                <p className="text-gray-300 text-sm">
                  Share this link with friends and earn ₹50 when they enroll!
                </p>
                
                <div className="flex items-center bg-gray-700 rounded-xl p-4 border border-gray-600">
                  <input
                    type="text"
                    value={referralLink}
                    readOnly
                    className="flex-1 bg-transparent text-white text-sm truncate focus:outline-none"
                  />
                  <button
                    onClick={copyReferralLink}
                    className="ml-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-lg text-sm hover:from-purple-700 hover:to-purple-600 transition-all flex items-center"
                  >
                    <FiCopy className="mr-2" />
                    Copy Link
                  </button>
                </div>
                
                {referralId && (
                  <div className="bg-gradient-to-r from-green-600/20 to-green-500/20 rounded-xl p-4 border border-green-500/30">
                    <p className="text-green-400 text-sm font-medium">🎉 Referral Bonus Applied!</p>
                    <p className="text-gray-300 text-sm mt-1">
                      You registered using referral from: <span className="font-bold">{referralId.substring(0, 8)}...</span>
                    </p>
                    <p className="text-gray-300 text-sm mt-2">
                      Your referrer will receive ₹50 cashback!
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-r from-orange-600/20 to-orange-500/20 rounded-xl border border-orange-500/30">
              <h4 className="font-bold text-white mb-2">📱 Important Instructions</h4>
              <ul className="text-gray-300 text-sm text-left space-y-2">
                <li className="flex items-start">
                  <div className="w-5 h-5 bg-orange-600 rounded-full flex items-center justify-center mt-0.5 mr-2 flex-shrink-0">
                    <FiCheckCircle className="text-white text-xs" />
                  </div>
                  <span>Take a screenshot of this page for future reference</span>
                </li>
                <li className="flex items-start">
                  <div className="w-5 h-5 bg-orange-600 rounded-full flex items-center justify-center mt-0.5 mr-2 flex-shrink-0">
                    <FiCheckCircle className="text-white text-xs" />
                  </div>
                  <span>Your OTP has been saved to your profile in Firestore</span>
                </li>
                <li className="flex items-start">
                  <div className="w-5 h-5 bg-orange-600 rounded-full flex items-center justify-center mt-0.5 mr-2 flex-shrink-0">
                    <FiCheckCircle className="text-white text-xs" />
                  </div>
                  <span>Payment details are stored in the CoursesPurchase collection</span>
                </li>
                <li className="flex items-start">
                  <div className="w-5 h-5 bg-orange-600 rounded-full flex items-center justify-center mt-0.5 mr-2 flex-shrink-0">
                    <FiCheckCircle className="text-white text-xs" />
                  </div>
                  <span>You will receive course access instructions via email</span>
                </li>
              </ul>
            </div>
            
            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full py-3 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl font-semibold hover:from-orange-700 hover:to-orange-600 transition-all"
            >
              Got it, Close this Message
            </button>
            
            <p className="text-gray-400 text-sm">
              Note: Your data has been securely saved to Firebase Firestore.
            </p>
          </div>
        </div>
      </Modal>

      <ToastContainer 
        position="top-right" 
        autoClose={5000}
        theme="dark"
        toastClassName="bg-gray-800 text-white border border-gray-700"
        progressClassName="bg-gradient-to-r from-orange-600 to-orange-500"
      />
    </div>
  );
};

export default Signinsinup;