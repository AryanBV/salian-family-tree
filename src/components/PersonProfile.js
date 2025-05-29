import React from 'react';
import { User, Edit, Plus, Trash2, Calendar, MapPin, Heart, Users, X } from 'lucide-react';

const PersonProfile = ({ 
  person, 
  isOpen, 
  onClose, 
  onAddChild, 
  onAddParent,
  onEdit, 
  onDelete,
  familyData 
}) => {
  if (!isOpen || !person) return null;

  const getAge = () => {
    if (!person.birthYear) return null;
    const currentYear = new Date().getFullYear();
    const endYear = person.deathYear || currentYear;
    return endYear - person.birthYear;
  };

  const getChildren = () => {
    return familyData.filter(member => member.parentId === person.id);
  };

  const getParent = () => {
    return familyData.find(member => member.id === person.parentId);
  };

  const handleDelete = () => {
    const children = getChildren();
    if (children.length > 0) {
      alert(`Cannot delete ${person.name} because they have ${children.length} child(ren). Please delete or reassign their children first.`);
      return;
    }
    
    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${person.name}? This action cannot be undone.`
    );
    
    if (confirmDelete) {
      onDelete(person.id);
      onClose();
    }
  };

  const children = getChildren();
  const parent = getParent();
  const age = getAge();

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '600px' }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '1rem', 
          marginBottom: '1.5rem',
          borderBottom: '1px solid #e5e7eb',
          paddingBottom: '1rem'
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: person.isMainLineage ? '#3b82f6' : '#10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '24px',
            fontWeight: 'bold',
            flexShrink: 0
          }}>
            {person.gender === 'female' ? '♀' : '♂'}
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ 
              margin: '0 0 0.25rem 0', 
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: '#1f2937'
            }}>
              {person.name}
            </h2>
            <div style={{ 
              fontSize: '0.875rem', 
              color: '#6b7280',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              flexWrap: 'wrap'
            }}>
              {person.isMainLineage && (
                <span style={{ 
                  background: '#dbeafe',
                  color: '#1e40af',
                  padding: '0.125rem 0.5rem',
                  borderRadius: '0.25rem',
                  fontSize: '0.75rem',
                  fontWeight: '500'
                }}>
                  Main Salian Lineage
                </span>
              )}
              <span style={{ textTransform: 'capitalize' }}>{person.gender}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              color: '#6b7280',
              cursor: 'pointer',
              padding: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Personal Information */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ 
            fontSize: '1.125rem', 
            fontWeight: '600', 
            margin: '0 0 1rem 0',
            color: '#1f2937'
          }}>
            Personal Information
          </h3>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '1rem' 
          }}>
            {/* Birth/Death Info */}
            <div style={{ 
              background: '#f9fafb', 
              padding: '1rem', 
              borderRadius: '0.5rem',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                marginBottom: '0.5rem' 
              }}>
                <Calendar size={16} color="#6b7280" />
                <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                  Dates
                </span>
              </div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                Born: {person.birthYear || 'Unknown'}
                {person.deathYear && (
                  <div>Died: {person.deathYear}</div>
                )}
                {age && (
                  <div style={{ fontWeight: '500', color: '#374151' }}>
                    {person.deathYear ? `Lived ${age} years` : `Age: ${age}`}
                  </div>
                )}
              </div>
            </div>

            {/* Location */}
            {person.location && (
              <div style={{ 
                background: '#f9fafb', 
                padding: '1rem', 
                borderRadius: '0.5rem',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  marginBottom: '0.5rem' 
                }}>
                  <MapPin size={16} color="#6b7280" />
                  <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                    Location
                  </span>
                </div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  {person.location}
                </div>
              </div>
            )}

            {/* Spouse */}
            {person.spouse && (
              <div style={{ 
                background: '#f9fafb', 
                padding: '1rem', 
                borderRadius: '0.5rem',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  marginBottom: '0.5rem' 
                }}>
                  <Heart size={16} color="#6b7280" />
                  <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                    Spouse
                  </span>
                </div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  {person.spouse}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Family Relationships */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ 
            fontSize: '1.125rem', 
            fontWeight: '600', 
            margin: '0 0 1rem 0',
            color: '#1f2937'
          }}>
            Family Relationships
          </h3>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '1rem' 
          }}>
            {/* Parent */}
            {parent && (
              <div style={{ 
                background: '#f0f9ff', 
                padding: '1rem', 
                borderRadius: '0.5rem',
                border: '1px solid #bae6fd'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  marginBottom: '0.5rem' 
                }}>
                  <User size={16} color="#0284c7" />
                  <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#0284c7' }}>
                    Parent
                  </span>
                </div>
                <div style={{ fontSize: '0.875rem', color: '#0369a1' }}>
                  {parent.name}
                </div>
              </div>
            )}

            {/* Children */}
            {children.length > 0 && (
              <div style={{ 
                background: '#f0fdf4', 
                padding: '1rem', 
                borderRadius: '0.5rem',
                border: '1px solid #bbf7d0',
                gridColumn: children.length > 3 ? 'span 2' : 'auto'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  marginBottom: '0.5rem' 
                }}>
                  <Users size={16} color="#059669" />
                  <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#059669' }}>
                    Children ({children.length})
                  </span>
                </div>
                <div style={{ fontSize: '0.875rem', color: '#047857' }}>
                  {children.map(child => child.name).join(', ')}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
          gap: '0.75rem',
          borderTop: '1px solid #e5e7eb',
          paddingTop: '1rem',
          marginTop: 'auto'
        }}>
          <button
            onClick={() => onAddChild(person)}
            style={{
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '0.75rem',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              transition: 'background-color 0.2s'
            }}
          >
            <Plus size={16} />
            Add Child
          </button>

          <button
            onClick={() => onAddParent(person)}
            style={{
              background: '#7c3aed',
              color: 'white',
              border: 'none',
              padding: '0.75rem',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              opacity: parent ? 0.5 : 1,
              transition: 'background-color 0.2s'
            }}
            disabled={!!parent}
            title={parent ? "Parent already exists" : "Add parent to this person"}
          >
            <User size={16} />
            Add Parent
          </button>
          
          <button
            onClick={() => onEdit(person)}
            style={{
              background: '#059669',
              color: 'white',
              border: 'none',
              padding: '0.75rem',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              transition: 'background-color 0.2s'
            }}
          >
            <Edit size={16} />
            Edit
          </button>
          
          <button
            onClick={handleDelete}
            style={{
              background: '#dc2626',
              color: 'white',
              border: 'none',
              padding: '0.75rem',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              transition: 'background-color 0.2s'
            }}
          >
            <Trash2 size={16} />
            Delete
          </button>
          
          <button
            onClick={onClose}
            style={{
              background: '#e5e7eb',
              color: '#374151',
              border: 'none',
              padding: '0.75rem',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              gridColumn: window.innerWidth <= 768 ? 'span 2' : 'auto',
              transition: 'background-color 0.2s'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PersonProfile;