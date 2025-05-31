import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Search, Plus, Users, Download, Upload, Cloud, Wifi, WifiOff, ZoomIn, ZoomOut, Home } from 'lucide-react';
import AddPersonForm from './AddPersonForm';
import PersonProfile from './PersonProfile';
import { initialFamilyData, searchFamilyData } from '../data/familyData';
import { familyService } from '../services/firebase';
import '../styles/FamilyTree.css';

const FamilyTree = () => {
  // State management
  const [familyData, setFamilyData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [editingPerson, setEditingPerson] = useState(null);
  const [addingParentFor, setAddingParentFor] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('Connected');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  // ZOOM STATE - Track current transform
  const [currentTransform, setCurrentTransform] = useState({ x: 100, y: 50, k: 1 });
  const [nodePositions, setNodePositions] = useState([]);
  
  // Refs
  const svgRef = useRef();
  const unsubscribeRef = useRef(null);
  const zoomRef = useRef(null);

  // Check for mobile on resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Build hierarchy
  const buildHierarchy = (data) => {
    if (!data || data.length === 0) return null;
    const map = new Map();
    const roots = [];

    data.forEach(person => {
      map.set(person.id, { ...person, children: [] });
    });

    data.forEach(person => {
      if (person.parentId) {
        const parent = map.get(person.parentId);
        const child = map.get(person.id);
        if (parent && child) {
          parent.children.push(child);
        }
      } else {
        roots.push(map.get(person.id));
      }
    });

    const sortChildren = (node) => {
      if (node.children && node.children.length > 0) {
        node.children.sort((a, b) => {
          if (a.siblingOrder !== undefined && b.siblingOrder !== undefined) {
            return a.siblingOrder - b.siblingOrder;
          }
          if (a.birthYear && b.birthYear) {
            return a.birthYear - b.birthYear;
          }
          if (a.birthYear && !b.birthYear) return -1;
          if (!a.birthYear && b.birthYear) return 1;
          return 0;
        });
        node.children.forEach(sortChildren);
      }
    };

    roots.forEach(sortChildren);
    if (roots.length === 0) return null;
    if (roots.length === 1) return roots[0];
    return { id: 'virtual-root', name: 'Salian Family', isVirtual: true, children: roots };
  };

  // Load data from Firebase
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setConnectionStatus('Connecting...');
        
        const localData = localStorage.getItem('salianFamilyData');
        if (localData) {
          try {
            const parsedLocalData = JSON.parse(localData);
            const existingData = await familyService.getAllMembers();
            if (existingData.length === 0 && parsedLocalData.length > 0) {
              await familyService.migrateLocalData(parsedLocalData);
              localStorage.removeItem('salianFamilyData');
              setConnectionStatus('Data migrated to cloud');
            }
          } catch (error) {
            console.error('Error during migration:', error);
          }
        }

        const unsubscribe = familyService.subscribeToMembers((members) => {
          setFamilyData(members);
          setIsLoading(false);
          setConnectionStatus('Connected');
          setIsOnline(true);
        });

        unsubscribeRef.current = unsubscribe;

        setTimeout(async () => {
          try {
            const currentData = await familyService.getAllMembers();
            if (currentData.length === 0) {
              await familyService.migrateLocalData(initialFamilyData);
            }
          } catch (error) {
            console.error('Error adding initial data:', error);
          }
        }, 1000);

      } catch (error) {
        console.error('Error loading data from Firebase:', error);
        setIsLoading(false);
        setConnectionStatus('Connection failed');
        setIsOnline(false);
        
        const localData = localStorage.getItem('salianFamilyData');
        if (localData) {
          try {
            setFamilyData(JSON.parse(localData));
          } catch (e) {
            setFamilyData(initialFamilyData);
          }
        } else {
          setFamilyData(initialFamilyData);
        }
      }
    };

    loadData();
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setConnectionStatus('Connected');
    };
    const handleOffline = () => {
      setIsOnline(false);
      setConnectionStatus('Offline');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const filteredData = searchFamilyData(familyData, searchTerm);
  const hierarchyData = buildHierarchy(filteredData);

  // FIXED: Click handler that opens profile
  const handlePersonClick = (person) => {
    console.log("✅ PERSON CLICKED:", person.name);
    setShowAddForm(false);
    setEditingPerson(null);
    setAddingParentFor(null);
    setSelectedPerson(person);
    setShowProfile(true);
  };

  // ZOOM CONTROLS - Proper zoom handling
  const handleZoom = (scaleFactor) => {
    if (!zoomRef.current || !svgRef.current) return;
    
    const svg = d3.select(svgRef.current);
    svg.transition()
      .duration(300)
      .call(zoomRef.current.scaleBy, scaleFactor);
  };

  const resetView = () => {
    if (!zoomRef.current || !svgRef.current) return;
    
    const svg = d3.select(svgRef.current);
    svg.transition()
      .duration(500)
      .call(zoomRef.current.transform, d3.zoomIdentity.translate(100, 50).scale(1));
  };

  // MAIN RENDERING - Fixed D3 + Zoom + React Overlays
  useEffect(() => {
    if (!hierarchyData || !svgRef.current || isLoading) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Dynamic dimensions based on family size
    const baseWidth = 1400;
    const baseHeight = 900;
    
    // Count total family members for sizing
    const familySize = familyData.length;
    
    const width = familySize > 10 ? Math.max(baseWidth, 1800) : baseWidth;
    const height = familySize > 15 ? Math.max(baseHeight, 1200) : baseHeight;

    // Create main group for all tree content
    const mainGroup = svg.append("g").attr("class", "tree-content");

    // ZOOM SETUP - Only affects the main group
    const zoom = d3.zoom()
      .scaleExtent([0.1, 3])
      .on("zoom", (event) => {
        const transform = event.transform;
        mainGroup.attr("transform", transform);
        
        // FIXED: Only update state if transform actually changed significantly
        const newTransform = {
          x: transform.x,
          y: transform.y,
          k: transform.k
        };
        
        // Prevent infinite loops by checking if values actually changed
        if (Math.abs(newTransform.x - currentTransform.x) > 1 || 
            Math.abs(newTransform.y - currentTransform.y) > 1 || 
            Math.abs(newTransform.k - currentTransform.k) > 0.01) {
          setCurrentTransform(newTransform);
        }
      });

    // Store zoom reference for controls
    zoomRef.current = zoom;

    // Apply zoom to SVG (but only to background, not nodes)
    svg.call(zoom);

    // Set initial transform
    mainGroup.attr("transform", `translate(${currentTransform.x},${currentTransform.y}) scale(${currentTransform.k})`);

    // Tree layout with balanced spacing
    const treeLayout = d3.tree()
      .nodeSize([200, 140])  // Reduced spacing: more compact but not overlapping
      .separation((a, b) => {
        // Balanced space between siblings and cousins
        if (a.parent === b.parent) return 1.2;  // Siblings: closer
        return 1.4;  // Cousins: slightly more space
      });
    
    const root = d3.hierarchy(hierarchyData);
    treeLayout(root);

    const nodes = root.descendants().filter(d => !d.data.isVirtual);
    const links = root.links().filter(d => !d.source.data.isVirtual);

    // Calculate actual tree bounds for better centering
    const bounds = {
      minX: d3.min(nodes, d => d.x),
      maxX: d3.max(nodes, d => d.x),
      minY: d3.min(nodes, d => d.y),
      maxY: d3.max(nodes, d => d.y)
    };

    // Dynamic sizing based on tree content
    const treeWidth = (bounds.maxX - bounds.minX) + 400; // Extra padding
    const treeHeight = (bounds.maxY - bounds.minY) + 300;
    
    // Use larger dimensions if tree needs it
    const dynamicWidth = Math.max(width, treeWidth);
    const dynamicHeight = Math.max(height, treeHeight);

    // Better centering with more padding
    const offsetX = (dynamicWidth - (bounds.maxX - bounds.minX)) / 2 - bounds.minX;
    const offsetY = 120; // Fixed top padding

    // Store node positions for React overlays
    const positions = nodes.map(node => ({
      id: node.data.id,
      name: node.data.name,
      x: node.x + offsetX,
      y: node.y + offsetY,
      data: node.data
    }));
    setNodePositions(positions);

    // Draw links
    mainGroup.selectAll(".link")
      .data(links)
      .enter().append("path")
      .attr("class", "link")
      .attr("d", d3.linkVertical()
        .x(d => d.x + offsetX)
        .y(d => d.y + offsetY))
      .style("fill", "none")
      .style("stroke", "#ccc")
      .style("stroke-width", 2)
      .style("pointer-events", "none"); // Important: prevent link interference

    // Draw nodes
    const nodeGroups = mainGroup.selectAll(".node")
      .data(nodes)
      .enter().append("g")
      .attr("class", "node")
      .attr("transform", d => `translate(${d.x + offsetX},${d.y + offsetY})`)
      .style("pointer-events", "none"); // CRITICAL: Disable D3 pointer events

    // Card background
    nodeGroups.append("rect")
      .attr("x", -90)
      .attr("y", -60)
      .attr("width", 180)
      .attr("height", 120)
      .attr("rx", 12)
      .style("fill", "white")
      .style("stroke", d => d.data.isMainLineage ? "#3b82f6" : "#10b981")
      .style("stroke-width", 2)
      .style("filter", "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))")
      .style("pointer-events", "none");

    // Avatar circle
    nodeGroups.append("circle")
      .attr("cx", -55)
      .attr("cy", -25)
      .attr("r", 25)
      .style("fill", d => d.data.isMainLineage ? "#3b82f6" : "#10b981")
      .style("pointer-events", "none");

    // Gender symbol
    nodeGroups.append("text")
      .attr("x", -55)
      .attr("y", -30)
      .attr("text-anchor", "middle")
      .style("fill", "white")
      .style("font-size", "14px")
      .style("font-weight", "bold")
      .style("pointer-events", "none")
      .text(d => d.data.gender === 'female' ? '♀' : '♂');

    // Initial
    nodeGroups.append("text")
      .attr("x", -55)
      .attr("y", -15)
      .attr("text-anchor", "middle")
      .style("fill", "white")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .text(d => d.data.name.charAt(0).toUpperCase());

    // Name
    nodeGroups.append("text")
      .attr("x", -15)
      .attr("y", -35)
      .style("fill", "#1f2937")
      .style("font-size", "14px")
      .style("font-weight", "600")
      .style("pointer-events", "none")
      .text(d => {
        const name = d.data.name;
        return name.length > 14 ? name.substring(0, 14) + '...' : name;
      });

    // Birth/death years
    nodeGroups.append("text")
      .attr("x", -15)
      .attr("y", -15)
      .style("fill", "#6b7280")
      .style("font-size", "11px")
      .style("pointer-events", "none")
      .text(d => {
        const birth = d.data.birthYear || '?';
        const death = d.data.deathYear ? ` - ${d.data.deathYear}` : '';
        return `${birth}${death}`;
      });

    // Location
    nodeGroups.append("text")
      .attr("x", -80)
      .attr("y", 15)
      .style("fill", "#9ca3af")
      .style("font-size", "10px")
      .style("pointer-events", "none")
      .text(d => {
        const location = d.data.location || '';
        return location.length > 20 ? location.substring(0, 20) + '...' : location;
      });

    // Main lineage badge
    nodeGroups.filter(d => d.data.isMainLineage)
      .append("rect")
      .attr("x", 50)
      .attr("y", 42)
      .attr("width", 35)
      .attr("height", 12)
      .attr("rx", 6)
      .style("fill", "#dbeafe")
      .style("stroke", "#3b82f6")
      .style("stroke-width", 1)
      .style("pointer-events", "none");

    nodeGroups.filter(d => d.data.isMainLineage)
      .append("text")
      .attr("x", 67.5)
      .attr("y", 50)
      .attr("text-anchor", "middle")
      .style("fill", "#1e40af")
      .style("font-size", "7px")
      .style("font-weight", "bold")
      .style("pointer-events", "none")
      .text("MAIN");

  }, [hierarchyData, isLoading, currentTransform]);

  // Handler functions
  const handleAddPerson = async (newPerson) => {
    try {
      setConnectionStatus('Saving...');
      
      if (addingParentFor) {
        console.log('Processing parent addition for:', addingParentFor.name);
        console.log('New parent data:', newPerson);
        
        // Step 1: Create the parent first
        const parentResult = await familyService.addMember(newPerson);
        console.log('Parent created with ID:', parentResult.id);
        
        // Step 2: Update the child to point to the new parent
        const updatedChild = {
          ...addingParentFor,
          parentId: parentResult.id,
          // Update lineage: child is main lineage if parent is female and child is female
          isMainLineage: newPerson.gender === 'female' && addingParentFor.gender === 'female'
        };
        
        console.log('Updating child with:', updatedChild);
        
        // Make sure we're using the correct ID for the update
        const childId = addingParentFor.id || addingParentFor.firestoreId;
        if (!childId) {
          throw new Error('Child ID not found for update');
        }
        
        await familyService.updateMember(childId, updatedChild);
        console.log('Child updated successfully');
        
        setAddingParentFor(null);
        setConnectionStatus('Parent added successfully');
      } else {
        // Regular person addition
        console.log('Adding regular person:', newPerson);
        await familyService.addMember(newPerson);
        setConnectionStatus('Person added successfully');
      }
      
      setTimeout(() => setConnectionStatus('Connected'), 3000);
    } catch (error) {
      console.error('Error adding person:', error);
      console.error('Error details:', {
        addingParentFor: addingParentFor,
        newPerson: newPerson,
        errorMessage: error.message,
        errorStack: error.stack
      });
      setConnectionStatus('Save failed - check console for details');
      alert(`Failed to save person: ${error.message}`);
    }
  };

  const handleEditPerson = async (updatedPerson) => {
  try {
    setConnectionStatus('Updating...');
    
    // Use the correct ID (either id or firestoreId)
    const personId = updatedPerson.id || updatedPerson.firestoreId;
    if (!personId) {
      throw new Error('Person ID not found for update');
    }
    
    console.log('Updating person with ID:', personId);
    console.log('Updated data:', updatedPerson);
    
    await familyService.updateMember(personId, updatedPerson);
    
    // IMPORTANT: Update the selectedPerson state so PersonProfile shows new data
    if (selectedPerson && selectedPerson.id === updatedPerson.id) {
      setSelectedPerson({
        ...updatedPerson,
        id: personId,
        firestoreId: personId
      });
    }
    
    setConnectionStatus('Updated');
    setTimeout(() => setConnectionStatus('Connected'), 2000);
  } catch (error) {
    console.error('Error updating person:', error);
    setConnectionStatus('Update failed');
    alert(`Failed to update person: ${error.message}`);
  }
};

// Updated edit button click handler in PersonProfile
const handleEditClick = (person) => {
  console.log('Edit clicked for:', person);
  setEditingPerson(person);
  setAddingParentFor(null);
  setShowProfile(false); // Close profile
  setShowAddForm(true);   // Open edit form
};

// Updated form close handler to refresh the profile
const handleFormClose = () => {
  setShowAddForm(false);
  setEditingPerson(null);
  setAddingParentFor(null);
  
  // If we were editing and selectedPerson exists, refresh the profile
  if (editingPerson && selectedPerson && editingPerson.id === selectedPerson.id) {
    // Find the updated person in familyData
    const updatedPersonFromData = familyData.find(p => 
      p.id === selectedPerson.id || p.firestoreId === selectedPerson.id
    );
    
    if (updatedPersonFromData) {
      setSelectedPerson(updatedPersonFromData);
    }
    
    // Reopen the profile to show updated data
    setShowProfile(true);
  } else {
    setSelectedPerson(null);
  }
};

  const handleDeletePerson = async (personId) => {
    try {
      setConnectionStatus('Deleting...');
      await familyService.deleteMember(personId);
      setConnectionStatus('Deleted');
      setTimeout(() => setConnectionStatus('Connected'), 2000);
    } catch (error) {
      console.error('Error deleting person:', error);
      setConnectionStatus('Delete failed');
    }
  };

  const handleUpdateSiblingOrder = async (siblings) => {
    try {
      setConnectionStatus('Updating order...');
      for (let i = 0; i < siblings.length; i++) {
        await familyService.updateMember(siblings[i].id, {
          ...siblings[i],
          siblingOrder: i
        });
      }
      setConnectionStatus('Order updated');
      setTimeout(() => setConnectionStatus('Connected'), 2000);
    } catch (error) {
      console.error('Error updating sibling order:', error);
      setConnectionStatus('Update failed');
    }
  };

  const exportData = async () => {
    try {
      setConnectionStatus('Exporting...');
      const data = await familyService.getAllMembers();
      const dataStr = JSON.stringify(data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'salian-family-data.json';
      link.click();
      URL.revokeObjectURL(url);
      setConnectionStatus('Exported');
      setTimeout(() => setConnectionStatus('Connected'), 2000);
    } catch (error) {
      console.error('Error exporting data:', error);
      setConnectionStatus('Export failed');
    }
  };

  const importData = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          setConnectionStatus('Importing...');
          const importedData = JSON.parse(e.target.result);
          for (const person of importedData) {
            const { id, firestoreId, createdAt, updatedAt, ...personData } = person;
            await familyService.addMember(personData);
          }
          setConnectionStatus('Import successful');
          setTimeout(() => setConnectionStatus('Connected'), 2000);
        } catch (error) {
          console.error('Error importing data:', error);
          setConnectionStatus('Import failed');
        }
      };
      reader.readAsText(file);
    }
  };

  if (isLoading) {
    return (
      <div className="family-tree-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <Cloud size={48} style={{ marginBottom: '1rem', animation: 'pulse 2s infinite' }} />
          <h2>Loading Family Tree...</h2>
          <p>Connecting to Firebase database</p>
        </div>
      </div>
    );
  }

  return (
    <div className="family-tree-container">
      {/* Header */}
      <div className="header">
        <div className="header-content">
          <div className="title-section">
            <Users size={isMobile ? 24 : 32} color="#3b82f6" />
            <h1 className="title">Salian Family Tree</h1>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              fontSize: '0.75rem',
              color: isOnline ? '#059669' : '#dc2626',
              background: isOnline ? '#d1fae5' : '#fee2e2',
              padding: '0.25rem 0.5rem',
              borderRadius: '0.25rem'
            }}>
              {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
              {isMobile ? (isOnline ? 'On' : 'Off') : connectionStatus}
            </div>
          </div>
          <div className="controls-section">
            <div className="search-container">
              <Search className="search-icon" size={16} />
              <input
                type="text"
                placeholder="Search family members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} style={{
                  position: 'absolute', right: '0.5rem', top: '50%',
                  transform: 'translateY(-50%)', background: 'none',
                  border: 'none', cursor: 'pointer', color: '#6b7280'
                }}>✕</button>
              )}
            </div>
            
            <button onClick={exportData} className="add-button" style={{ background: '#059669' }}>
              <Download size={16} />
              {!isMobile && 'Export'}
            </button>
            
            <label className="add-button" style={{ background: '#7c3aed' }}>
              <Upload size={16} />
              {!isMobile && 'Import'}
              <input type="file" accept=".json" onChange={importData} style={{ display: 'none' }} />
            </label>
            
            <button
              onClick={() => {
                setSelectedPerson(null);
                setEditingPerson(null);
                setAddingParentFor(null);
                setShowAddForm(true);
              }}
              className="add-button"
            >
              <Plus size={16} />
              {!isMobile && 'Add Person'}
            </button>
          </div>
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="zoom-controls">
        <button onClick={() => handleZoom(1.2)} className="zoom-button" title="Zoom In">
          <ZoomIn size={20} />
        </button>
        <button onClick={() => handleZoom(0.8)} className="zoom-button" title="Zoom Out">
          <ZoomOut size={20} />
        </button>
        <button onClick={resetView} className="zoom-button" title="Reset View">
          <Home size={20} />
        </button>
      </div>

      {/* Legend */}
      {!isMobile && (
        <div className="legend">
          <h3>Legend</h3>
          <div className="legend-item">
            <div className="legend-circle legend-main"></div>
            <span>Main Salian lineage (♀)</span>
          </div>
          <div className="legend-item">
            <div className="legend-circle legend-member"></div>
            <span>Salian family member</span>
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: '#9ca3af' }}>
            Click any card to view profile & actions
          </div>
        </div>
      )}

      {/* Tree Container with Dynamic SVG sizing */}
      <div className="tree-container" style={{ position: 'relative' }}>
        <svg
          ref={svgRef}
          width={familyData.length > 10 ? 1800 : 1400}
          height={familyData.length > 15 ? 1200 : 900}
          className="tree-svg"
        />
        
        {/* FIXED: React Click Overlays that follow zoom transforms */}
        {nodePositions.map(node => (
          <button
            key={node.id}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              console.log("🎯 REACT OVERLAY CLICKED:", node.name);
              handlePersonClick(node.data);
            }}
            style={{
              position: 'absolute',
              // Apply current transform to overlay position
              left: (node.x - 90) * currentTransform.k + currentTransform.x,
              top: (node.y - 60) * currentTransform.k + currentTransform.y,
              width: 180 * currentTransform.k,
              height: 120 * currentTransform.k,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              zIndex: 10,
              pointerEvents: 'auto'
            }}
            title={`Click to view ${node.name}'s profile`}
          />
        ))}
      </div>

      {/* Modals */}
      {showProfile && selectedPerson && (
        <PersonProfile
          person={selectedPerson}
          isOpen={true}
          onClose={() => {
            setShowProfile(false);
            setSelectedPerson(null);
          }}
          onAddChild={(person) => {
            setSelectedPerson(person);
            setAddingParentFor(null);
            setShowProfile(false);
            setShowAddForm(true);
          }}
          onAddParent={(person) => {
            setAddingParentFor(person);
            setSelectedPerson(null);
            setShowProfile(false);
            setShowAddForm(true);
          }}
          onEdit={(person) => {
            setEditingPerson(person);
            setAddingParentFor(null);
            setShowProfile(false);
            setShowAddForm(true);
          }}
          onDelete={handleDeletePerson}
          onUpdateSiblingOrder={handleUpdateSiblingOrder}
          familyData={familyData}
        />
      )}

      {showAddForm && (
        <AddPersonForm
          isOpen={true}
          onClose={() => {
            setShowAddForm(false);
            setSelectedPerson(null);
            setEditingPerson(null);
            setAddingParentFor(null);
          }}
          onAddPerson={editingPerson ? handleEditPerson : handleAddPerson}
          selectedParent={selectedPerson}
          familyData={familyData}
          editingPerson={editingPerson}
          isEditing={!!editingPerson}
          addingParentFor={addingParentFor}
        />
      )}

      {/* Data info */}
      <div style={{
        position: 'fixed', bottom: '1rem', right: '1rem',
        background: 'rgba(255,255,255,0.9)', padding: '0.5rem',
        borderRadius: '0.25rem', fontSize: '0.75rem', color: '#6b7280'
      }}>
        {familyData.length} family members • {isOnline ? 'Cloud storage' : 'Offline mode'}
        {searchTerm && ` • Showing ${filteredData.length} matches`}
      </div>
    </div>
  );
};

export default FamilyTree;