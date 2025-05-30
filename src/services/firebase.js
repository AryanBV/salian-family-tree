// Firebase configuration and services
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  onSnapshot,
  orderBy,
  query 
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBmh-KGMlapCjnB04tpMDT_fmi59HzaAR91",
  authDomain: "salian-family-tree.firebaseapp.com",
  projectId: "salian-family-tree",
  storageBucket: "salian-family-tree.firebasestorage.app",
  messagingSenderId: "591726593673",
  appId: "1:591726593673:web:5a2c9324426bf31f072858"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Storage
export const storage = getStorage(app);

// Collection reference
const COLLECTION_NAME = 'family_members';

// Firebase service functions for family data
export const familyService = {
  // Get all family members
  async getAllMembers() {
    try {
      const querySnapshot = await getDocs(
        query(collection(db, COLLECTION_NAME), orderBy('name'))
      );
      const members = [];
      querySnapshot.forEach((doc) => {
        members.push({
          id: doc.id,
          firestoreId: doc.id, // Keep track of Firestore document ID
          ...doc.data()
        });
      });
      return members;
    } catch (error) {
      console.error('Error getting family members:', error);
      throw error;
    }
  },

  // Add a new family member
  async addMember(memberData) {
    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...memberData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      return {
        id: docRef.id,
        firestoreId: docRef.id,
        ...memberData
      };
    } catch (error) {
      console.error('Error adding family member:', error);
      throw error;
    }
  },

  // Update a family member
  async updateMember(memberId, memberData) {
    try {
      const memberRef = doc(db, COLLECTION_NAME, memberId);
      await updateDoc(memberRef, {
        ...memberData,
        updatedAt: new Date()
      });
      return true;
    } catch (error) {
      console.error('Error updating family member:', error);
      throw error;
    }
  },

  // Delete a family member
  async deleteMember(memberId) {
    try {
      const memberRef = doc(db, COLLECTION_NAME, memberId);
      await deleteDoc(memberRef);
      console.log('Successfully deleted family member:', memberId);
      return true;
    } catch (error) {
      console.error('Error deleting family member:', error);
      throw error;
    }
  },

  // Subscribe to real-time updates
  subscribeToMembers(callback) {
    const unsubscribe = onSnapshot(
      query(collection(db, COLLECTION_NAME), orderBy('name')),
      (querySnapshot) => {
        const members = [];
        querySnapshot.forEach((doc) => {
          members.push({
            id: doc.id,
            firestoreId: doc.id,
            ...doc.data()
          });
        });
        callback(members);
      },
      (error) => {
        console.error('Error in real-time subscription:', error);
      }
    );
    
    return unsubscribe; // Call this function to stop listening
  },

  // Migrate data from localStorage to Firebase
  async migrateLocalData(localData) {
    try {
      console.log('Migrating', localData.length, 'family members to Firebase...');
      
      for (const member of localData) {
        // Remove the old numeric ID and let Firebase generate new ones
        const { id, ...memberWithoutId } = member;
        await this.addMember(memberWithoutId);
      }
      
      console.log('Migration completed successfully!');
      return true;
    } catch (error) {
      console.error('Error migrating data:', error);
      throw error;
    }
  }
};

// Storage service for photos
export const storageService = {
  // Upload a photo
  async uploadPhoto(file, personName) {
    try {
      // Create a unique filename
      const timestamp = Date.now();
      const safeName = personName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const fileName = `photos/${safeName}_${timestamp}_${file.name}`;
      
      // Create storage reference
      const storageRef = ref(storage, fileName);
      
      // Upload file
      const snapshot = await uploadBytes(storageRef, file);
      
      // Get download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      console.log('Photo uploaded successfully:', downloadURL);
      return downloadURL;
    } catch (error) {
      console.error('Error uploading photo:', error);
      throw error;
    }
  },

  // Delete a photo
  async deletePhoto(photoURL) {
    try {
      // Extract the file path from the URL
      // Firebase Storage URLs contain the path after '/o/'
      const matches = photoURL.match(/\/o\/(.+?)\?/);
      if (!matches) {
        console.error('Invalid photo URL:', photoURL);
        return false;
      }
      
      const filePath = decodeURIComponent(matches[1]);
      const storageRef = ref(storage, filePath);
      
      await deleteObject(storageRef);
      console.log('Photo deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting photo:', error);
      // Don't throw error if photo doesn't exist
      if (error.code === 'storage/object-not-found') {
        console.log('Photo already deleted or not found');
        return true;
      }
      throw error;
    }
  }
};

// Export the initialized app and db for other uses
export { app };
export default db;