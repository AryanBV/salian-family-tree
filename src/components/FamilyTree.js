import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Search, Plus, Home, ZoomIn, ZoomOut, Users, Download, Upload } from 'lucide-react';
import AddPersonForm from './AddPersonForm';
import { initialFamilyData, buildHierarchy } from '../data/familyData';
import '../styles/FamilyTree.css';

const FamilyTree = () => {
  // State management
  const [familyData, setFamilyData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedParent, setSelectedParent] = useState(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  
  // Refs
  const svgRef = useRef();
  const dimensions = { width: 1200, height: 800 };

  // Load data from localStorage on component mount
  useEffect(() => {
    const savedData = localStorage.getItem('salianFamilyData');
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        setFamilyData(parsedData);
      } catch (error) {
        console.error('Error loading saved data:', error);
        setFamilyData(initialFamilyData);
      }
    } else {
      setFamilyData(initialFamilyData);
    }
  }, []);

  // Save data to localStorage whenever familyData changes
  useEffect(() => {
    if (familyData.length > 0) {
      localStorage.setItem('salianFamilyData', JSON.stringify(familyData));
    }
  }, [familyData]);

  // Filter data based on search
  const filteredData = familyData.filter(person =>
    person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (person.location && person.location.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const hierarchyData = buildHierarchy(searchTerm ? filteredData : familyData);

  // D3 Tree Visualization
  useEffect(() => {
    if (!hierarchyData || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = dimensions.width;
    const height = dimensions.height;

    // Create zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.3, 3])
      .on("zoom", (event) => {
        setTransform(event.transform);
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    const g = svg.append("g")
      .attr("transform", `translate(${transform.x},${transform.y}) scale(${transform.k})`);

    // Create tree layout
    const treeLayout = d3.tree()
      .size([width - 200, height - 200])
      .separation((a, b) => (a.parent === b.parent ? 1 : 1.5));

    const root = d3.hierarchy(hierarchyData);
    treeLayout(root);

    // Draw links (family connections)
    g.selectAll(".tree-link")
      .data(root.links())
      .enter().append("path")
      .attr("class", "tree-link")
      .attr("d", d3.linkVertical()
        .x(d => d.x + 100)
        .y(d => d.y + 100))
      .style("fill", "none")
      .style("stroke", "#999")
      .style("stroke-width", 2);

    // Draw nodes (family members)
    const nodes = g.selectAll(".tree-node")
      .data(root.descendants())
      .enter().append("g")
      .attr("class", "tree-node")
      .attr("transform", d => `translate(${d.x + 100},${d.y + 100})`)
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        setSelectedParent(d.data);
        setShowAddForm(true);
      });

    // Node background circles
    nodes.append("circle")
      .attr("r", d => d.data.isMainLineage ? 30 : 25)
      .style("fill", d => {
        if (d.data.deathYear) return "#e2e8f0"; // Deceased - light gray
        return d.data.isMainLineage ? "#3b82f6" : "#10b981"; // Living - blue for main line, green for others
      })
      .style("stroke", d => d.data.isMainLineage ? "#1d4ed8" : "#059669")
      .style("stroke-width", 3)
      .style("opacity", d => d.data.deathYear ? 0.7 : 1);

    // Gender indicators
    nodes.append("text")
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .style("fill", "white")
      .style("font-weight", "bold")
      .style("font-size", "14px")
      .text(d => d.data.gender === 'female' ? '♀' : '♂');

    // Name labels
    nodes.append("text")
      .attr("dy", "3.5em")
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .style("font-weight", d => d.data.isMainLineage ? "bold" : "normal")
      .style("fill", d => d.data.deathYear ? "#64748b" : "#1f2937")
      .text(d => d.data.name);

    // Birth/Death years
    nodes.append("text")
      .attr("dy", "5em")
      .attr("text-anchor", "middle")
      .style("font-size", "11px")
      .style("fill", "#6b7280")
      .text(d => {
        const birth = d.data.birthYear || '?';
        const death = d.data.deathYear ? `-${d.data.deathYear}` : '-';
        return `${birth}${death}`;
      });

    // Location
    nodes.append("text")
      .attr("dy", "6.5em")
      .attr("text-anchor", "middle")
      .style("font-size", "10px")
      .style("fill", "#9ca3af")
      .text(d => d.data.location || '');

    // Spouse information (if available)
    nodes.append("text")
      .attr("dy", "7.8em")
      .attr("text-anchor", "middle")
      .style("font-size", "9px")
      .style("fill", "#9ca3af")
      .style("font-style", "italic")
      .text(d => d.data.spouse ? `m. ${d.data.spouse}` : '');

  }, [hierarchyData, dimensions, transform]);

  // Add new person
  const handleAddPerson = (newPerson) => {
    setFamilyData(prev => [...prev, newPerson]);
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

  // Export family data
  const exportData = () => {
    const dataStr = JSON.stringify(familyData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'salian-family-data.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  // Import family data
  const importData = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedData = JSON.parse(e.target.result);
          setFamilyData(importedData);
          alert('Family data imported successfully!');
        } catch (error) {
          alert('Error importing data. Please check the file format.');
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="family-tree-container">
      {/* Header */}
      <div className="header">
        <div className="header-content">
          <div className="title-section">
            <Users size={32} color="#3b82f6" />
            <h1 className="title">Salian Family Tree</h1>
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
            </div>
            
            {/* Export/Import */}
            <button onClick={exportData} className="add-button" style={{ background: '#059669' }}>
              <Download size={16} />
              Export
            </button>
            
            <label className="add-button" style={{ background: '#7c3aed' }}>
              <Upload size={16} />
              Import
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
                setSelectedParent(null);
                setShowAddForm(true);
              }}
              className="add-button"
            >
              <Plus size={16} />
              Add Person
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
        <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: '#9ca3af' }}>
          Click any person to add their child
        </div>
      </div>

      {/* Family Tree */}
      <div className="tree-container">
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className="tree-svg"
        />
      </div>

      {/* Add Person Form Modal */}
      <AddPersonForm
        isOpen={showAddForm}
        onClose={() => {
          setShowAddForm(false);
          setSelectedParent(null);
        }}
        onAddPerson={handleAddPerson}
        selectedParent={selectedParent}
        familyData={familyData}
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
        {familyData.length} family members • Data saved locally
      </div>
    </div>
  );
};

export default FamilyTree;