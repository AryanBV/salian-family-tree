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

// Export the initialized app and db for other uses
export { app };
export default db;