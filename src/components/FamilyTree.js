import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Search, Plus, Home, ZoomIn, ZoomOut, Users, Download, Upload, Cloud, Wifi, WifiOff, User, MapPin, Heart, Menu, GripVertical } from 'lucide-react';
import AddPersonForm from './AddPersonForm';
import PersonProfile from './PersonProfile';
import { initialFamilyData, searchFamilyData } from '../data/familyData';
import { familyService } from '../services/firebase'; // Removed storageService until Firebase Storage is available
import '../styles/FamilyTree.css';
// import html2canvas from 'html2canvas'; // Commented out for now

const FamilyTree = () => {
  // State management
  const [familyData, setFamilyData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [editingPerson, setEditingPerson] = useState(null);
  const [addingParentFor, setAddingParentFor] = useState(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('Connected');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showMinimap, setShowMinimap] = useState(false);
  
  // Refs
  const svgRef = useRef();
  const containerRef = useRef();
  const unsubscribeRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 1400, height: 900 });

  // Check for mobile on resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Enhanced buildHierarchy with sibling ordering
  const buildHierarchy = (data) => {
    if (!data || data.length === 0) return null;

    const map = new Map();
    const roots = [];

    // Create nodes
    data.forEach(person => {
      map.set(person.id, { ...person, children: [] });
    });

    // Build parent-child relationships
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

    // Sort children by birth year, then by sibling order, keeping original order as fallback
    const sortChildren = (node) => {
      if (node.children && node.children.length > 0) {
        node.children.sort((a, b) => {
          // First priority: sibling order (if exists)
          if (a.siblingOrder !== undefined && b.siblingOrder !== undefined) {
            return a.siblingOrder - b.siblingOrder;
          }
          // Second priority: birth year
          if (a.birthYear && b.birthYear) {
            return a.birthYear - b.birthYear;
          }
          // If one has birth year and other doesn't, prioritize the one with birth year
          if (a.birthYear && !b.birthYear) return -1;
          if (!a.birthYear && b.birthYear) return 1;
          // Keep original order
          return 0;
        });
        // Recursively sort grandchildren
        node.children.forEach(sortChildren);
      }
    };

    roots.forEach(sortChildren);

    // If multiple roots exist, create a virtual root to contain them all
    if (roots.length === 0) return null;
    if (roots.length === 1) return roots[0];
    
    // Multiple roots - create virtual root
    return {
      id: 'virtual-root',
      name: 'Salian Family',
      isVirtual: true,
      children: roots
    };
  };

  // Load data from Firebase on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setConnectionStatus('Connecting...');
        
        // Check if there's existing localStorage data to migrate
        const localData = localStorage.getItem('salianFamilyData');
        if (localData) {
          try {
            const parsedLocalData = JSON.parse(localData);
            console.log('Found local data, checking if Firebase is empty...');
            
            // Get existing Firebase data
            const existingData = await familyService.getAllMembers();
            
            if (existingData.length === 0 && parsedLocalData.length > 0) {
              // Firebase is empty but localStorage has data - migrate it
              console.log('Migrating localStorage data to Firebase...');
              await familyService.migrateLocalData(parsedLocalData);
              
              // Clear localStorage after successful migration
              localStorage.removeItem('salianFamilyData');
              setConnectionStatus('Data migrated to cloud');
            }
          } catch (error) {
            console.error('Error during migration:', error);
          }
        }

        // Set up real-time listener
        const unsubscribe = familyService.subscribeToMembers((members) => {
          console.log('Received', members.length, 'family members from Firebase');
          setFamilyData(members);
          setIsLoading(false);
          setConnectionStatus('Connected');
          setIsOnline(true);
        });

        unsubscribeRef.current = unsubscribe;

        // If no data in Firebase and no localStorage, add initial data
        setTimeout(async () => {
          try {
            const currentData = await familyService.getAllMembers();
            if (currentData.length === 0) {
              console.log('No data found, adding initial family data...');
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
        
        // Fallback to localStorage if Firebase fails
        const localData = localStorage.getItem('salianFamilyData');
        if (localData) {
          try {
            const parsedData = JSON.parse(localData);
            setFamilyData(parsedData);
          } catch (e) {
            setFamilyData(initialFamilyData);
          }
        } else {
          setFamilyData(initialFamilyData);
        }
      }
    };

    loadData();

    // Cleanup subscription on unmount
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

  // Use enhanced search that maintains tree structure
  const filteredData = searchFamilyData(familyData, searchTerm);
  const hierarchyData = buildHierarchy(filteredData);

  // Calculate tree dimensions based on data
  useEffect(() => {
    if (!hierarchyData) return;

    const root = d3.hierarchy(hierarchyData);
    const treeLayout = d3.tree()
      .nodeSize([220, 180]); // Use fixed node size
    treeLayout(root);

    // Calculate bounds
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    root.descendants().forEach(d => {
      minX = Math.min(minX, d.x);
      maxX = Math.max(maxX, d.x);
      minY = Math.min(minY, d.y);
      maxY = Math.max(maxY, d.y);
    });

    // Add generous padding to prevent any overlaps
    const padding = 300;
    const cardWidth = 180;
    const cardHeight = 120;
    
    // Ensure minimum dimensions and add extra space for horizontal spread
    const width = Math.max(1600, (maxX - minX) + padding * 2 + cardWidth * 2);
    const height = Math.max(900, (maxY - minY) + padding * 2 + cardHeight);

    setDimensions({ width, height });
  }, [hierarchyData]);

  // Enhanced Tree Visualization with dynamic sizing
  useEffect(() => {
    if (!hierarchyData || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = dimensions.width;
    const height = dimensions.height;

    // Create zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        setTransform(event.transform);
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    // Mobile touch events - Fixed for better navigation
    if (isMobile) {
      let lastTouchDistance = 0;
      let lastTouchTime = 0;
      let touchStartX = 0;
      let touchStartY = 0;
      let isPanning = false;

      svg.on("touchstart", function(event) {
        event.preventDefault();
        
        if (event.touches.length === 2) {
          // Pinch zoom start
          lastTouchDistance = Math.hypot(
            event.touches[0].pageX - event.touches[1].pageX,
            event.touches[0].pageY - event.touches[1].pageY
          );
        } else if (event.touches.length === 1) {
          // Check for double tap
          const currentTime = new Date().getTime();
          const tapLength = currentTime - lastTouchTime;
          
          if (tapLength < 300 && tapLength > 0) {
            // Double tap - zoom in
            const touch = event.touches[0];
            const rect = svg.node().getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            
            svg.transition().duration(300).call(
              zoom.scaleBy,
              2,
              [x, y]
            );
          } else {
            // Single touch - prepare for pan
            touchStartX = event.touches[0].pageX;
            touchStartY = event.touches[0].pageY;
            isPanning = true;
          }
          lastTouchTime = currentTime;
        }
      });

      svg.on("touchmove", function(event) {
        event.preventDefault();
        
        if (event.touches.length === 2 && lastTouchDistance > 0) {
          // Pinch zoom
          const currentDistance = Math.hypot(
            event.touches[0].pageX - event.touches[1].pageX,
            event.touches[0].pageY - event.touches[1].pageY
          );
          
          const scale = currentDistance / lastTouchDistance;
          svg.call(zoom.scaleBy, scale);
          
          lastTouchDistance = currentDistance;
        } else if (event.touches.length === 1 && isPanning) {
          // Pan
          const dx = event.touches[0].pageX - touchStartX;
          const dy = event.touches[0].pageY - touchStartY;
          
          const currentTransform = d3.zoomTransform(svg.node());
          svg.call(zoom.transform, d3.zoomIdentity
            .translate(currentTransform.x + dx, currentTransform.y + dy)
            .scale(currentTransform.k)
          );
          
          touchStartX = event.touches[0].pageX;
          touchStartY = event.touches[0].pageY;
        }
      });

      svg.on("touchend", function(event) {
        isPanning = false;
        lastTouchDistance = 0;
      });
    }

    const g = svg.append("g")
      .attr("transform", `translate(${transform.x},${transform.y}) scale(${transform.k})`);

    // Create tree layout with much better spacing to prevent overlaps
    const treeLayout = d3.tree()
      .size([width - 400, height - 300])
      .nodeSize([220, 180]) // Fixed node size to ensure consistent spacing
      .separation((a, b) => {
        // Always ensure minimum spacing between siblings
        if (a.parent === b.parent) {
          return 1.5; // 1.5x the node width between siblings
        }
        return 2; // 2x the node width between cousins
      });

    const root = d3.hierarchy(hierarchyData);
    treeLayout(root);

    // Card dimensions
    const cardWidth = 180;
    const cardHeight = 120;

    // Adjust positions to center the tree
    const bounds = {
      minX: d3.min(root.descendants(), d => d.x),
      maxX: d3.max(root.descendants(), d => d.x),
      minY: d3.min(root.descendants(), d => d.y),
      maxY: d3.max(root.descendants(), d => d.y)
    };

    const offsetX = (width - (bounds.maxX - bounds.minX)) / 2 - bounds.minX;
    const offsetY = 150;

    // Draw links (family connections) - skip virtual root links
    const links = root.links().filter(d => !d.source.data.isVirtual);
    g.selectAll(".tree-link")
      .data(links)
      .enter().append("path")
      .attr("class", "tree-link")
      .attr("d", d3.linkVertical()
        .x(d => d.x + offsetX)
        .y(d => d.y + offsetY + cardHeight/2))
      .style("fill", "none")
      .style("stroke", "#cbd5e1")
      .style("stroke-width", 2);

    // Draw nodes (family member cards) - skip virtual root
    const nodes = root.descendants().filter(d => !d.data.isVirtual);
    const nodeGroups = g.selectAll(".tree-node")
      .data(nodes)
      .enter().append("g")
      .attr("class", "tree-node")
      .attr("transform", d => `translate(${d.x + offsetX - cardWidth/2},${d.y + offsetY})`)
      .style("cursor", "pointer");

    // Add click handler to the entire group
    nodeGroups.on("click", function(event, d) {
      event.stopPropagation();
      setSelectedPerson(d.data);
      setShowProfile(true);
    });

    // Card backgrounds with proper pointer events
    nodeGroups.append("rect")
      .attr("width", cardWidth)
      .attr("height", cardHeight)
      .attr("rx", 12)
      .style("fill", "white")
      .style("stroke", d => {
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase();
          const isMatch = d.data.name.toLowerCase().includes(searchLower) ||
                         (d.data.location && d.data.location.toLowerCase().includes(searchLower));
          if (isMatch) return "#f59e0b";
        }
        return d.data.isMainLineage ? "#3b82f6" : "#10b981";
      })
      .style("stroke-width", d => {
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase();
          const isMatch = d.data.name.toLowerCase().includes(searchLower) ||
                         (d.data.location && d.data.location.toLowerCase().includes(searchLower));
          if (isMatch) return 4;
        }
        return 2;
      })
      .style("opacity", d => d.data.deathYear ? 0.8 : 1)
      .style("filter", "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))")
      .style("pointer-events", "all"); // Ensure rect can receive click events

    // Photo or placeholder
    const photoRadius = 25;
    nodeGroups.each(function(d) {
      const group = d3.select(this);
      
      if (d.data.photoURL) {
        // Add clipPath for circular photo
        const clipId = `clip-${d.data.id}`;
        group.append("defs")
          .append("clipPath")
          .attr("id", clipId)
          .append("circle")
          .attr("cx", 35)
          .attr("cy", 35)
          .attr("r", photoRadius);

        // Add photo
        group.append("image")
          .attr("x", 35 - photoRadius)
          .attr("y", 35 - photoRadius)
          .attr("width", photoRadius * 2)
          .attr("height", photoRadius * 2)
          .attr("clip-path", `url(#${clipId})`)
          .attr("href", d.data.photoURL);
      } else {
        // Gender icon placeholder
        group.append("circle")
          .attr("cx", 35)
          .attr("cy", 35)
          .attr("r", photoRadius)
          .style("fill", d.data.isMainLineage ? "#3b82f6" : "#10b981")
          .style("opacity", d.data.deathYear ? 0.7 : 1);

        // Gender symbol and initial
        group.append("text")
          .attr("x", 35)
          .attr("y", 30)
          .attr("text-anchor", "middle")
          .style("fill", "white")
          .style("font-size", "14px")
          .style("font-weight", "bold")
          .text(d.data.gender === 'female' ? '♀' : '♂');

        // Initial
        group.append("text")
          .attr("x", 35)
          .attr("y", 45)
          .attr("text-anchor", "middle")
          .style("fill", "white")
          .style("font-size", "12px")
          .text(d.data.name.charAt(0).toUpperCase());
      }
    });

    // Main lineage indicator
    nodeGroups.filter(d => d.data.isMainLineage)
      .append("rect")
      .attr("x", cardWidth - 40)
      .attr("y", cardHeight - 18)
      .attr("width", 35)
      .attr("height", 12)
      .attr("rx", 6)
      .style("fill", "#dbeafe")
      .style("stroke", "#3b82f6")
      .style("stroke-width", 1);

    nodeGroups.filter(d => d.data.isMainLineage)
      .append("text")
      .attr("x", cardWidth - 22.5)
      .attr("y", cardHeight - 10)
      .attr("text-anchor", "middle")
      .style("fill", "#1e40af")
      .style("font-size", "7px")
      .style("font-weight", "bold")
      .text("MAIN");

    // Name
    nodeGroups.append("text")
      .attr("x", 70)
      .attr("y", 25)
      .style("fill", d => d.data.deathYear ? "#64748b" : "#1f2937")
      .style("font-size", "14px")
      .style("font-weight", "600")
      .text(d => {
        const name = d.data.name;
        return name.length > 14 ? name.substring(0, 14) + '...' : name;
      });

    // Nickname if exists
    nodeGroups.filter(d => d.data.nickname)
      .append("text")
      .attr("x", 70)
      .attr("y", 40)
      .style("fill", "#9ca3af")
      .style("font-size", "11px")
      .style("font-style", "italic")
      .text(d => `"${d.data.nickname}"`);

    // Birth/Death years
    nodeGroups.append("text")
      .attr("x", 70)
      .attr("y", d => d.data.nickname ? 55 : 45)
      .style("fill", "#6b7280")
      .style("font-size", "11px")
      .text(d => {
        const birth = d.data.birthYear || '?';
        const death = d.data.deathYear ? ` - ${d.data.deathYear}` : '';
        return `${birth}${death}`;
      });

    // Location
    nodeGroups.append("text")
      .attr("x", 10)
      .attr("y", 75)
      .style("fill", "#9ca3af")
      .style("font-size", "10px")
      .text(d => {
        const location = d.data.location || '';
        return location.length > 20 ? location.substring(0, 20) + '...' : location;
      });

    // Spouse
    nodeGroups.append("text")
      .attr("x", 10)
      .attr("y", 93)
      .style("fill", "#9ca3af")
      .style("font-size", "9px")
      .style("font-style", "italic")
      .text(d => {
        const spouse = d.data.spouse;
        if (!spouse) return '';
        const text = `m. ${spouse}`;
        return text.length > 22 ? text.substring(0, 22) + '...' : text;
      });

    // Deceased overlay
    nodeGroups.filter(d => d.data.deathYear)
      .append("rect")
      .attr("width", cardWidth)
      .attr("height", cardHeight)
      .attr("rx", 12)
      .style("fill", "rgba(0, 0, 0, 0.1)")
      .style("pointer-events", "none");

    // Hover effects
    nodeGroups
      .on("mouseenter", function(event, d) {
        d3.select(this).select("rect")
          .style("stroke-width", 3)
          .style("filter", "drop-shadow(0 8px 15px rgba(0, 0, 0, 0.2))");
      })
      .on("mouseleave", function(event, d) {
        d3.select(this).select("rect")
          .style("stroke-width", d => {
            if (searchTerm) {
              const searchLower = searchTerm.toLowerCase();
              const isMatch = d.data.name.toLowerCase().includes(searchLower) ||
                             (d.data.location && d.data.location.toLowerCase().includes(searchLower));
              if (isMatch) return 4;
            }
            return 2;
          })
          .style("filter", "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))");
      });

    // Auto-center on mobile
    if (isMobile && nodes.length > 0) {
      // Find the root or first person
      const centerNode = nodes.find(n => !n.parent) || nodes[0];
      const centerX = centerNode.x + offsetX;
      const centerY = centerNode.y + offsetY + cardHeight/2;
      
      // Calculate zoom to show 2-3 generations
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight - 120; // Account for header
      const scale = Math.min(viewportWidth / 600, viewportHeight / 400, 1);
      
      const transform = d3.zoomIdentity
        .translate(viewportWidth/2, viewportHeight/3)
        .scale(scale)
        .translate(-centerX, -centerY);
      
      svg.call(zoom.transform, transform);
    }

  }, [hierarchyData, dimensions, transform, searchTerm, isMobile]);

  // Add new person to Firebase
  const handleAddPerson = async (newPerson) => {
    try {
      setConnectionStatus('Saving...');
      
      // Special handling for adding parents
      if (addingParentFor) {
        // Create parent first
        const parentResult = await familyService.addMember(newPerson);
        
        // Update the child to have this parent
        const updatedChild = {
          ...addingParentFor,
          parentId: parentResult.id,
          // Recalculate main lineage status
          isMainLineage: newPerson.gender === 'female' && addingParentFor.gender === 'female'
        };
        
        await familyService.updateMember(addingParentFor.id, updatedChild);
        setAddingParentFor(null);
      } else {
        await familyService.addMember(newPerson);
      }
      
      setConnectionStatus('Saved to cloud');
      
      // Success feedback
      setTimeout(() => {
        if (isOnline) {
          setConnectionStatus('Connected');
        }
      }, 2000);
    } catch (error) {
      console.error('Error adding person:', error);
      setConnectionStatus('Save failed');
      
      // Show error for a moment
      setTimeout(() => {
        setConnectionStatus(isOnline ? 'Connected' : 'Offline');
      }, 3000);
    }
  };

  // Edit person
  const handleEditPerson = async (updatedPerson) => {
    try {
      setConnectionStatus('Updating...');
      await familyService.updateMember(updatedPerson.id, updatedPerson);
      setConnectionStatus('Updated');
      
      setTimeout(() => {
        if (isOnline) {
          setConnectionStatus('Connected');
        }
      }, 2000);
    } catch (error) {
      console.error('Error updating person:', error);
      setConnectionStatus('Update failed');
      
      setTimeout(() => {
        setConnectionStatus(isOnline ? 'Connected' : 'Offline');
      }, 3000);
    }
  };

  // Delete person
  const handleDeletePerson = async (personId) => {
    try {
      setConnectionStatus('Deleting...');
      
      // Find the person to delete
      const personToDelete = familyData.find(p => p.id === personId);
      
      // Photo deletion disabled until Firebase Storage is available
      /*
      // Delete photo from storage if exists
      if (personToDelete && personToDelete.photoURL) {
        try {
          await storageService.deletePhoto(personToDelete.photoURL);
        } catch (error) {
          console.error('Error deleting photo:', error);
        }
      }
      */
      
      await familyService.deleteMember(personId);
      setConnectionStatus('Deleted');
      
      setTimeout(() => {
        if (isOnline) {
          setConnectionStatus('Connected');
        }
      }, 2000);
    } catch (error) {
      console.error('Error deleting person:', error);
      setConnectionStatus('Delete failed');
      
      setTimeout(() => {
        setConnectionStatus(isOnline ? 'Connected' : 'Offline');
      }, 3000);
    }
  };

  // Update sibling order
  const handleUpdateSiblingOrder = async (siblings) => {
    try {
      setConnectionStatus('Updating order...');
      
      // Update each sibling with new order
      for (let i = 0; i < siblings.length; i++) {
        await familyService.updateMember(siblings[i].id, {
          ...siblings[i],
          siblingOrder: i
        });
      }
      
      setConnectionStatus('Order updated');
      setTimeout(() => {
        setConnectionStatus(isOnline ? 'Connected' : 'Offline');
      }, 2000);
    } catch (error) {
      console.error('Error updating sibling order:', error);
      setConnectionStatus('Update failed');
    }
  };

  // Download tree as PNG - Temporarily disabled
  const downloadTreeAsPNG = async () => {
    alert('PNG download feature requires html2canvas package. Please install it with: npm install html2canvas');
    return;
    
    /* Original code - uncomment after installing html2canvas
    try {
      setConnectionStatus('Preparing download...');
      
      // Create a temporary container for the tree
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.background = 'white';
      tempContainer.style.padding = '20px';
      document.body.appendChild(tempContainer);

      // Clone the SVG
      const svgElement = svgRef.current;
      const clonedSvg = svgElement.cloneNode(true);
      
      // Add title
      const title = document.createElement('h1');
      title.textContent = 'Salian Family Tree';
      title.style.textAlign = 'center';
      title.style.marginBottom = '20px';
      title.style.fontFamily = 'Arial, sans-serif';
      tempContainer.appendChild(title);
      
      tempContainer.appendChild(clonedSvg);

      // Use html2canvas to convert to image
      const canvas = await html2canvas(tempContainer, {
        width: dimensions.width + 40,
        height: dimensions.height + 100,
        scale: 2
      });

      // Download the image
      const link = document.createElement('a');
      link.download = 'salian-family-tree.png';
      link.href = canvas.toDataURL();
      link.click();

      // Clean up
      document.body.removeChild(tempContainer);
      setConnectionStatus('Downloaded');
      
      setTimeout(() => {
        setConnectionStatus(isOnline ? 'Connected' : 'Offline');
      }, 2000);
    } catch (error) {
      console.error('Error downloading tree:', error);
      setConnectionStatus('Download failed');
    }
    */
  };

  // Zoom controls
  const handleZoom = (scale) => {
    const svg = d3.select(svgRef.current);
    const newTransform = d3.zoomIdentity
      .translate(transform.x, transform.y)
      .scale(transform.k * scale);
    
    svg.transition().duration(300).call(
      d3.zoom().transform,
      newTransform
    );
  };

  const resetView = () => {
    const svg = d3.select(svgRef.current);
    svg.transition().duration(500).call(
      d3.zoom().transform,
      d3.zoomIdentity.translate(100, 50)
    );
  };

  // Export family data from Firebase
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
      
      setTimeout(() => {
        setConnectionStatus(isOnline ? 'Connected' : 'Offline');
      }, 2000);
    } catch (error) {
      console.error('Error exporting data:', error);
      setConnectionStatus('Export failed');
    }
  };

  // Import family data to Firebase
  const importData = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          setConnectionStatus('Importing...');
          const importedData = JSON.parse(e.target.result);
          
          // Add each person to Firebase
          for (const person of importedData) {
            const { id, firestoreId, createdAt, updatedAt, ...personData } = person;
            await familyService.addMember(personData);
          }
          
          setConnectionStatus('Import successful');
          setTimeout(() => {
            setConnectionStatus(isOnline ? 'Connected' : 'Offline');
          }, 2000);
        } catch (error) {
          console.error('Error importing data:', error);
          setConnectionStatus('Import failed');
        }
      };
      reader.readAsText(file);
    }
  };

  // Clear search
  const clearSearch = () => {
    setSearchTerm('');
  };

  // Loading screen
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
            {/* Search */}
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
                <button
                  onClick={clearSearch}
                  style={{
                    position: 'absolute',
                    right: '0.5rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#6b7280'
                  }}
                >
                  ✕
                </button>
              )}
            </div>
            
            {/* Download Tree */}
            <button onClick={downloadTreeAsPNG} className="add-button" style={{ background: '#f59e0b' }}>
              <Download size={16} />
              {!isMobile && 'PNG'}
            </button>
            
            {/* Export/Import */}
            <button onClick={exportData} className="add-button" style={{ background: '#059669' }}>
              <Download size={16} />
              {!isMobile && 'Export'}
            </button>
            
            <label className="add-button" style={{ background: '#7c3aed' }}>
              <Upload size={16} />
              {!isMobile && 'Import'}
              <input
                type="file"
                accept=".json"
                onChange={importData}
                style={{ display: 'none' }}
              />
            </label>
            
            {/* Add Person Button */}
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
        {isMobile && (
          <button 
            onClick={() => setShowMinimap(!showMinimap)} 
            className="zoom-button" 
            title="Toggle Minimap"
            style={{ background: showMinimap ? '#3b82f6' : 'white', color: showMinimap ? 'white' : 'black' }}
          >
            <Menu size={20} />
          </button>
        )}
      </div>

      {/* Legend - Desktop only */}
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
          <div className="legend-item">
            <div className="legend-circle legend-deceased"></div>
            <span>Deceased</span>
          </div>
          {searchTerm && (
            <div className="legend-item">
              <div className="legend-circle" style={{ background: '#f59e0b', borderColor: '#f59e0b' }}></div>
              <span>Search matches</span>
            </div>
          )}
          <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: '#9ca3af' }}>
            Click any card to view profile & actions
          </div>
        </div>
      )}

      {/* Tree Container */}
      <div className="tree-container" ref={containerRef}>
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className="tree-svg"
        />
        
        {/* Minimap for mobile */}
        {isMobile && showMinimap && (
          <div className="minimap">
            <div className="minimap-viewport" style={{
              transform: `translate(${transform.x * 0.1}px, ${transform.y * 0.1}px) scale(${transform.k})`,
              width: `${100 / transform.k}%`,
              height: `${100 / transform.k}%`
            }} />
          </div>
        )}
      </div>

      {/* Person Profile Modal */}
      <PersonProfile
        person={selectedPerson}
        isOpen={showProfile}
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

      {/* Add/Edit Person Form Modal */}
      <AddPersonForm
        isOpen={showAddForm}
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

      {/* Data info */}
      <div style={{
        position: 'fixed',
        bottom: '1rem',
        right: '1rem',
        background: 'rgba(255,255,255,0.9)',
        padding: '0.5rem',
        borderRadius: '0.25rem',
        fontSize: '0.75rem',
        color: '#6b7280'
      }}>
        {familyData.length} family members • {isOnline ? 'Cloud storage' : 'Offline mode'}
        {searchTerm && ` • Showing ${filteredData.length} matches`}
      </div>
    </div>
  );
};

export default FamilyTree;