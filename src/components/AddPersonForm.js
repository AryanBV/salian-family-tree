import React, { useState, useEffect } from 'react';
import { Camera, X } from 'lucide-react';
// import { storageService } from '../services/firebase'; // Disabled until Firebase Storage is available

const AddPersonForm = ({ 
  isOpen, 
  onClose, 
  onAddPerson, 
  selectedParent, 
  familyData,
  editingPerson,
  isEditing = false,
  addingParentFor
}) => {
  const [formData, setFormData] = useState({
    name: '',
    nameKannada: '', // For future Kannada support
    nickname: '',
    birthYear: '',
    deathYear: '',
    location: '',
    locationKannada: '', // For future Kannada support
    gender: 'female',
    spouse: '',
    photoURL: '',
    siblingOrder: undefined
  });

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Pre-populate form when editing
  useEffect(() => {
    if (isEditing && editingPerson) {
      setFormData({
        name: editingPerson.name || '',
        nameKannada: editingPerson.nameKannada || '',
        nickname: editingPerson.nickname || '',
        birthYear: editingPerson.birthYear ? editingPerson.birthYear.toString() : '',
        deathYear: editingPerson.deathYear ? editingPerson.deathYear.toString() : '',
        location: editingPerson.location || '',
        locationKannada: editingPerson.locationKannada || '',
        gender: editingPerson.gender || 'female',
        spouse: editingPerson.spouse || '',
        photoURL: editingPerson.photoURL || '',
        siblingOrder: editingPerson.siblingOrder
      });
      
      if (editingPerson.photoURL) {
        setPhotoPreview(editingPerson.photoURL);
      }
    } else {
      // Reset form for adding new person
      setFormData({
        name: '',
        nameKannada: '',
        nickname: '',
        birthYear: '',
        deathYear: '',
        location: '',
        locationKannada: '',
        gender: 'female',
        spouse: '',
        photoURL: '',
        siblingOrder: undefined
      });
      setPhotoFile(null);
      setPhotoPreview(null);
    }
  }, [isEditing, editingPerson, isOpen]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (2MB limit)
      if (file.size > 2 * 1024 * 1024) {
        alert('Photo size must be less than 2MB');
        return;
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      setPhotoFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setFormData(prev => ({ ...prev, photoURL: '' }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      alert('Please enter a name');
      return;
    }

    setIsUploading(true);

    try {
      let photoURL = formData.photoURL;

      // Photo upload disabled until Firebase Storage is available
      /*
      // Upload photo if new one selected
      if (photoFile) {
        try {
          photoURL = await storageService.uploadPhoto(photoFile, formData.name);
        } catch (error) {
          console.error('Error uploading photo:', error);
          alert('Failed to upload photo. Person will be saved without photo.');
          photoURL = '';
        }
      }
      */

      if (isEditing) {
        // Photo deletion disabled until Firebase Storage is available
        /*
        // If photo was removed and there was an old photo, delete it
        if (!photoURL && editingPerson.photoURL) {
          try {
            await storageService.deletePhoto(editingPerson.photoURL);
          } catch (error) {
            console.error('Error deleting old photo:', error);
          }
        }
        */

        // Update existing person
        const updatedPerson = {
          ...editingPerson,
          name: formData.name,
          nameKannada: formData.nameKannada || null,
          nickname: formData.nickname || null,
          birthYear: formData.birthYear ? parseInt(formData.birthYear) : null,
          deathYear: formData.deathYear ? parseInt(formData.deathYear) : null,
          location: formData.location,
          locationKannada: formData.locationKannada || null,
          gender: formData.gender,
          spouse: formData.spouse || null,
          photoURL: photoURL || null,
          siblingOrder: formData.siblingOrder,
          // Recalculate main lineage status if gender changed
          isMainLineage: (() => {
            if (editingPerson.parentId) {
              const parent = familyData.find(p => p.id === editingPerson.parentId);
              return parent && parent.gender === 'female' && formData.gender === 'female';
            }
            return formData.gender === 'female';
          })()
        };

        await onAddPerson(updatedPerson);
      } else {
        // Add new person
        const isMainLineage = selectedParent ? 
          (selectedParent.gender === 'female' && formData.gender === 'female') : 
          (formData.gender === 'female');

        // Calculate sibling order if not provided
        let siblingOrder = formData.siblingOrder;
        if (siblingOrder === undefined && selectedParent) {
          const siblings = familyData.filter(p => p.parentId === selectedParent.id);
          siblingOrder = siblings.length;
        }

        const newPerson = {
          name: formData.name,
          nameKannada: formData.nameKannada || null,
          nickname: formData.nickname || null,
          birthYear: formData.birthYear ? parseInt(formData.birthYear) : null,
          deathYear: formData.deathYear ? parseInt(formData.deathYear) : null,
          location: formData.location,
          locationKannada: formData.locationKannada || null,
          gender: formData.gender,
          parentId: selectedParent ? selectedParent.id : null,
          isMainLineage,
          spouse: formData.spouse || null,
          photoURL: photoURL || null,
          siblingOrder: siblingOrder
        };

        await onAddPerson(newPerson);
      }
      
      // Reset form
      setFormData({
        name: '',
        nameKannada: '',
        nickname: '',
        birthYear: '',
        deathYear: '',
        location: '',
        locationKannada: '',
        gender: 'female',
        spouse: '',
        photoURL: '',
        siblingOrder: undefined
      });
      setPhotoFile(null);
      setPhotoPreview(null);
      
      onClose();
    } catch (error) {
      console.error('Error saving person:', error);
      alert('Failed to save person. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    // Reset form when closing
    setFormData({
      name: '',
      nameKannada: '',
      nickname: '',
      birthYear: '',
      deathYear: '',
      location: '',
      locationKannada: '',
      gender: 'female',
      spouse: '',
      photoURL: '',
      siblingOrder: undefined
    });
    setPhotoFile(null);
    setPhotoPreview(null);
    onClose();
  };

  if (!isOpen) return null;

  const willBeMainLineage = () => {
    if (isEditing) {
      if (editingPerson.parentId) {
        const parent = familyData.find(p => p.id === editingPerson.parentId);
        return parent && parent.gender === 'female' && formData.gender === 'female';
      }
      return formData.gender === 'female';
    } else if (addingParentFor) {
      // When adding a parent, the parent determines the child's lineage status
      return formData.gender === 'female' && addingParentFor.gender === 'female';
    } else {
      return selectedParent ? 
        (selectedParent.gender === 'female' && formData.gender === 'female') : 
        (formData.gender === 'female');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2 className="modal-title">
          {isEditing ? `Edit ${editingPerson?.name}` : 
           addingParentFor ? `Add Parent for ${addingParentFor.name}` : 
           'Add New Family Member'}
          {!isEditing && !addingParentFor && selectedParent && (
            <div style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: 'normal', marginTop: '0.25rem' }}>
              Child of: {selectedParent.name}
            </div>
          )}
        </h2>

        {/* Photo Upload - Disabled until Firebase Storage is available */}
        {false && (
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">Photo</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                border: '2px dashed #cbd5e1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer',
                background: photoPreview ? `url(${photoPreview}) center/cover` : '#f9fafb'
              }}>
                {!photoPreview && (
                  <Camera size={24} color="#9ca3af" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    opacity: 0,
                    cursor: 'pointer'
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                  Click to upload photo
                </p>
                <p style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                  Max size: 2MB • JPG, PNG
                </p>
                {photoPreview && (
                  <button
                    type="button"
                    onClick={removePhoto}
                    style={{
                      marginTop: '0.5rem',
                      background: '#dc2626',
                      color: 'white',
                      border: 'none',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '0.25rem',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}
                  >
                    <X size={14} />
                    Remove Photo
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        
        <div className="form-group">
          <label className="form-label">Full Name *</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            className="form-input"
            placeholder="Enter full name"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Nickname</label>
          <input
            type="text"
            name="nickname"
            value={formData.nickname}
            onChange={handleInputChange}
            className="form-input"
            placeholder="Enter nickname (optional)"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Birth Year</label>
            <input
              type="number"
              name="birthYear"
              value={formData.birthYear}
              onChange={handleInputChange}
              className="form-input"
              min="1800"
              max="2025"
              placeholder="e.g., 1970"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Death Year</label>
            <input
              type="number"
              name="deathYear"
              value={formData.deathYear}
              onChange={handleInputChange}
              className="form-input"
              min="1800"
              max="2025"
              placeholder="Leave empty if living"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Location</label>
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleInputChange}
            className="form-input"
            placeholder="e.g., Mumbai, Bangalore"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Gender</label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleInputChange}
              className="form-select"
            >
              <option value="female">Female</option>
              <option value="male">Male</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Spouse (Optional)</label>
            <input
              type="text"
              name="spouse"
              value={formData.spouse}
              onChange={handleInputChange}
              className="form-input"
              placeholder="Spouse name"
            />
          </div>
        </div>

        {/* Future Kannada fields - hidden for now */}
        {false && (
          <>
            <div className="form-group">
              <label className="form-label">Name in Kannada</label>
              <input
                type="text"
                name="nameKannada"
                value={formData.nameKannada}
                onChange={handleInputChange}
                className="form-input"
                placeholder="ಹೆಸರು"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Location in Kannada</label>
              <input
                type="text"
                name="locationKannada"
                value={formData.locationKannada}
                onChange={handleInputChange}
                className="form-input"
                placeholder="ಸ್ಥಳ"
              />
            </div>
          </>
        )}

        {/* Main lineage indicator */}
        {willBeMainLineage() && (
          <div style={{ 
            background: '#dbeafe', 
            border: '1px solid #3b82f6', 
            borderRadius: '0.375rem', 
            padding: '0.75rem', 
            marginBottom: '1rem',
            fontSize: '0.875rem',
            color: '#1e40af'
          }}>
            <strong>Main Lineage:</strong> This person will be part of the main Salian lineage and can pass the family name to daughters.
          </div>
        )}

        {/* Warning for changing parent's gender */}
        {isEditing && editingPerson && formData.gender !== editingPerson.gender && (
          <div style={{ 
            background: '#fef3c7', 
            border: '1px solid #f59e0b', 
            borderRadius: '0.375rem', 
            padding: '0.75rem', 
            marginBottom: '1rem',
            fontSize: '0.875rem',
            color: '#92400e'
          }}>
            <strong>Note:</strong> Changing gender may affect main lineage status and family tree relationships.
          </div>
        )}

        {/* Death year validation */}
        {formData.birthYear && formData.deathYear && parseInt(formData.deathYear) <= parseInt(formData.birthYear) && (
          <div style={{ 
            background: '#fee2e2', 
            border: '1px solid #dc2626', 
            borderRadius: '0.375rem', 
            padding: '0.75rem', 
            marginBottom: '1rem',
            fontSize: '0.875rem',
            color: '#dc2626'
          }}>
            <strong>Error:</strong> Death year must be after birth year.
          </div>
        )}

        <div className="button-group">
          <button
            onClick={handleSubmit}
            className="button-primary"
            disabled={
              isUploading || 
              (formData.birthYear && formData.deathYear && parseInt(formData.deathYear) <= parseInt(formData.birthYear))
            }
          >
            {isUploading ? 'Uploading...' : 
             isEditing ? 'Update Person' : 
             addingParentFor ? 'Add Parent' : 'Add Person'}
          </button>
          <button
            onClick={handleClose}
            className="button-secondary"
            disabled={isUploading}
          >
            Cancel
          </button>
        </div>

        {/* Help text */}
        <div style={{ 
          marginTop: '1rem', 
          fontSize: '0.75rem', 
          color: '#6b7280',
          borderTop: '1px solid #e5e7eb',
          paddingTop: '1rem'
        }}>
          <strong>Tip:</strong> In the Salian family tradition, the family name passes from mother to daughter. 
          Women who carry the Salian name forward are highlighted as "Main Lineage" members.
          {addingParentFor && (
            <div style={{ marginTop: '0.5rem' }}>
              <strong>Adding Parent:</strong> This person will become the parent of {addingParentFor.name}. 
              The child's lineage status may be updated accordingly.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddPersonForm;