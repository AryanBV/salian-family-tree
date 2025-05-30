import React, { useState, useEffect } from 'react';
import { User, Edit, Plus, Trash2, Calendar, MapPin, Heart, Users, X, GripVertical, ArrowUp, ArrowDown } from 'lucide-react';

const PersonProfile = ({ 
  person, 
  isOpen, 
  onClose, 
  onAddChild, 
  onAddParent,
  onEdit, 
  onDelete,
  onUpdateSiblingOrder,
  familyData 
}) => {
  const [siblings, setSiblings] = useState([]);
  const [draggedSibling, setDraggedSibling] = useState(null);
  const [showReorderMode, setShowReorderMode] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (person && person.parentId) {
      const siblingsList = familyData
        .filter(member => member.parentId === person.parentId)
        .sort((a, b) => {
          // Sort by sibling order first, then by birth year
          if (a.siblingOrder !== undefined && b.siblingOrder !== undefined) {
            return a.siblingOrder - b.siblingOrder;
          }
          if (a.birthYear && b.birthYear) {
            return a.birthYear - b.birthYear;
          }
          return 0;
        });
      setSiblings(siblingsList);
    } else {
      setSiblings([]);
    }
  }, [person, familyData]);

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

  // IMPROVED: Enhanced drag and drop with better cross-platform support
  const handleDragStart = (e, sibling, index) => {
    if (isMobile) return; // Disable HTML5 drag on mobile
    
    setDraggedSibling({ sibling, index });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
    
    // Add visual feedback
    setTimeout(() => {
      e.target.style.opacity = '0.5';
    }, 0);
  };

  const handleDragEnd = (e) => {
    if (isMobile) return;
    
    e.target.style.opacity = '1';
    setDraggedSibling(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e, index) => {
    if (isMobile) return;
    
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    if (isMobile) return;
    setDragOverIndex(null);
  };

  const handleDrop = (e, targetIndex) => {
    if (isMobile) return;
    
    e.preventDefault();
    setDragOverIndex(null);
    
    if (!draggedSibling || draggedSibling.index === targetIndex) {
      return;
    }

    const newSiblings = [...siblings];
    const draggedItem = newSiblings.splice(draggedSibling.index, 1)[0];
    newSiblings.splice(targetIndex, 0, draggedItem);

    setSiblings(newSiblings);
    onUpdateSiblingOrder(newSiblings);
    setDraggedSibling(null);
  };

  // Arrow button handlers for mobile and desktop fallback
  const moveSibling = (sibling, direction) => {
    const currentIndex = siblings.findIndex(s => s.id === sibling.id);
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (newIndex < 0 || newIndex >= siblings.length) return;

    const newSiblings = [...siblings];
    [newSiblings[currentIndex], newSiblings[newIndex]] = 
    [newSiblings[newIndex], newSiblings[currentIndex]];

    setSiblings(newSiblings);
    onUpdateSiblingOrder(newSiblings);
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
          {person.photoURL ? (
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              backgroundImage: `url(${person.photoURL})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              flexShrink: 0,
              border: `3px solid ${person.isMainLineage ? '#3b82f6' : '#10b981'}`
            }} />
          ) : (
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
              flexShrink: 0,
              position: 'relative'
            }}>
              <span>{person.gender === 'female' ? '♀' : '♂'}</span>
              <span style={{ fontSize: '14px', position: 'absolute', bottom: '5px' }}>
                {person.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div style={{ flex: 1 }}>
            <h2 style={{ 
              margin: '0 0 0.25rem 0', 
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: '#1f2937'
            }}>
              {person.name}
              {person.nickname && (
                <span style={{ 
                  fontSize: '1rem', 
                  fontWeight: 'normal', 
                  color: '#6b7280',
                  fontStyle: 'italic',
                  marginLeft: '0.5rem'
                }}>
                  "{person.nickname}"
                </span>
              )}
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

            {/* IMPROVED: Siblings with better drag and drop */}
            {siblings.length > 1 && (
              <div style={{ 
                background: '#fef3c7', 
                padding: '1rem', 
                borderRadius: '0.5rem',
                border: '1px solid #fbbf24',
                gridColumn: 'span 2'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  marginBottom: '0.5rem' 
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Users size={16} color="#f59e0b" />
                    <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#f59e0b' }}>
                      Siblings ({siblings.length})
                    </span>
                  </div>
                  <button
                    onClick={() => setShowReorderMode(!showReorderMode)}
                    style={{
                      background: showReorderMode ? '#f59e0b' : 'transparent',
                      color: showReorderMode ? 'white' : '#f59e0b',
                      border: `1px solid #f59e0b`,
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.25rem',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}
                  >
                    <GripVertical size={12} />
                    {showReorderMode ? 'Done' : 'Reorder'}
                  </button>
                </div>
                <div style={{ fontSize: '0.875rem', color: '#92400e' }}>
                  {showReorderMode ? (
                    <div>
                      {siblings.map((sibling, index) => (
                        <div
                          key={sibling.id}
                          draggable={!isMobile}
                          onDragStart={(e) => handleDragStart(e, sibling, index)}
                          onDragEnd={handleDragEnd}
                          onDragOver={(e) => handleDragOver(e, index)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, index)}
                          className={`draggable-sibling ${draggedSibling?.index === index ? 'dragging' : ''}`}
                          style={{
                            padding: '0.5rem',
                            margin: '0.25rem 0',
                            background: sibling.id === person.id ? '#fef3c7' : 
                                       dragOverIndex === index && draggedSibling?.index !== index ? '#fde68a' : 'white',
                            border: dragOverIndex === index && draggedSibling?.index !== index ? 
                                   '2px solid #f59e0b' : '1px solid #fbbf24',
                            borderRadius: '0.25rem',
                            cursor: !isMobile ? 'move' : 'default',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            transition: 'all 0.2s ease',
                            transform: draggedSibling?.index === index ? 'rotate(2deg) scale(1.02)' : 'none'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {!isMobile && (
                              <GripVertical size={16} color="#f59e0b" className="drag-indicator" />
                            )}
                            <span style={{ fontWeight: sibling.id === person.id ? 'bold' : 'normal' }}>
                              {index + 1}. {sibling.name}
                              {sibling.birthYear && ` (${sibling.birthYear})`}
                              {sibling.id === person.id && ' (You)'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <button
                              onClick={() => moveSibling(sibling, 'up')}
                              disabled={index === 0}
                              style={{
                                background: index === 0 ? '#f3f4f6' : '#f59e0b',
                                color: index === 0 ? '#9ca3af' : 'white',
                                border: 'none',
                                borderRadius: '0.25rem',
                                padding: '0.25rem',
                                cursor: index === 0 ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s'
                              }}
                              title="Move up"
                            >
                              <ArrowUp size={14} />
                            </button>
                            <button
                              onClick={() => moveSibling(sibling, 'down')}
                              disabled={index === siblings.length - 1}
                              style={{
                                background: index === siblings.length - 1 ? '#f3f4f6' : '#f59e0b',
                                color: index === siblings.length - 1 ? '#9ca3af' : 'white',
                                border: 'none',
                                borderRadius: '0.25rem',
                                padding: '0.25rem',
                                cursor: index === siblings.length - 1 ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s'
                              }}
                              title="Move down"
                            >
                              <ArrowDown size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                      {!isMobile && (
                        <div style={{ 
                          fontSize: '0.75rem', 
                          color: '#92400e', 
                          marginTop: '0.5rem',
                          textAlign: 'center',
                          fontStyle: 'italic'
                        }}>
                          💡 Drag siblings to reorder, or use arrow buttons
                        </div>
                      )}
                      {isMobile && (
                        <div style={{ 
                          fontSize: '0.75rem', 
                          color: '#92400e', 
                          marginTop: '0.5rem',
                          textAlign: 'center',
                          fontStyle: 'italic'
                        }}>
                          💡 Use arrow buttons to reorder siblings
                        </div>
                      )}
                    </div>
                  ) : (
                    siblings
                      .map(sibling => sibling.id === person.id ? `${sibling.name} (You)` : sibling.name)
                      .join(', ')
                  )}
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
              gridColumn: isMobile ? 'span 2' : 'auto',
              transition: 'background-color 0.2s'
            }}
          >
            Close
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
        </div>
      </div>
    </div>
  );
};

export default PersonProfile;