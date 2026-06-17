import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../api';
import { 
  ReactFlow, 
  Controls, 
  Background, 
  useNodesState, 
  useEdgesState, 
  addEdge,
  Handle,
  Position
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { 
  Play, 
  Settings, 
  Mail, 
  CheckSquare, 
  HelpCircle, 
  Plus, 
  Save, 
  ArrowLeft, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Clock, 
  List, 
  Activity,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Eye
} from 'lucide-react';

// Custom Nodes Components for React Flow
const TriggerNodeComponent = ({ data }) => {
  const eventLabels = {
    'lead_created': 'Lead Created 👤',
    'deal_stage_updated': 'Deal Stage Updated 💼'
  };
  return (
    <div style={{
      padding: '12px 16px',
      borderRadius: '8px',
      background: 'rgba(20, 10, 35, 0.85)',
      border: '2px solid rgb(147, 51, 234)',
      color: '#f3e8ff',
      minWidth: '180px',
      boxShadow: '0 4px 12px rgba(147, 51, 234, 0.25)',
      backdropFilter: 'blur(8px)'
    }}>
      <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#a78bfa', fontWeight: 'bold' }}>Trigger</div>
      <div style={{ fontSize: '0.9rem', fontWeight: '600', marginTop: '4px' }}>
        {eventLabels[data.event] || 'Select Event...'}
      </div>
      <Handle type="source" position={Position.Right} style={{ background: 'rgb(147, 51, 234)', width: '8px', height: '8px' }} />
    </div>
  );
};

const ConditionNodeComponent = ({ data }) => {
  const conditions = data.conditions || [];
  return (
    <div style={{
      padding: '12px 16px',
      borderRadius: '8px',
      background: 'rgba(35, 20, 10, 0.85)',
      border: '2px solid rgb(249, 115, 22)',
      color: '#ffedd5',
      minWidth: '200px',
      boxShadow: '0 4px 12px rgba(249, 115, 22, 0.25)',
      backdropFilter: 'blur(8px)'
    }}>
      <Handle type="target" position={Position.Left} style={{ background: '#f97316' }} />
      <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#fed7aa', fontWeight: 'bold' }}>Condition (If)</div>
      <div style={{ fontSize: '0.8rem', marginTop: '6px', maxHeight: '80px', overflow: 'hidden' }}>
        {data.field ? (
          <div>
            <code>{data.field}</code> {data.operator || '=='} <strong>{data.value}</strong>
          </div>
        ) : conditions.length === 0 ? (
          <span style={{ color: '#fdba74', fontStyle: 'italic' }}>Always True</span>
        ) : (
          conditions.map((c, i) => (
            <div key={i} style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              <code>{c.field}</code> {c.operator} <strong>{c.value}</strong>
            </div>
          ))
        )}
      </div>
      
      {/* Source Handles for Branches */}
      <Handle 
        type="source" 
        position={Position.Right} 
        id="true_branch" 
        style={{ background: '#10b981', top: '35%', width: '10px', height: '10px' }} 
        title="True Path"
      />
      <div style={{ position: 'absolute', right: '12px', top: '15%', fontSize: '0.65rem', color: '#10b981', fontWeight: 'bold' }}>True</div>

      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="false_branch" 
        style={{ background: '#ef4444', left: '50%', width: '10px', height: '10px' }} 
        title="False Path"
      />
      <div style={{ position: 'absolute', bottom: '12px', left: '38%', fontSize: '0.65rem', color: '#ef4444', fontWeight: 'bold' }}>False</div>
    </div>
  );
};

const EmailNodeComponent = ({ data }) => {
  return (
    <div style={{
      padding: '12px 16px',
      borderRadius: '8px',
      background: 'rgba(10, 25, 35, 0.85)',
      border: '2px solid rgb(14, 165, 233)',
      color: '#e0f2fe',
      minWidth: '180px',
      boxShadow: '0 4px 12px rgba(14, 165, 233, 0.25)',
      backdropFilter: 'blur(8px)'
    }}>
      <Handle type="target" position={Position.Left} style={{ background: 'rgb(14, 165, 233)' }} />
      <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#7dd3fc', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <Mail size={12} /> Send Email
      </div>
      <div style={{ fontSize: '0.85rem', fontWeight: '600', marginTop: '4px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
        {data.subject || 'Empty Subject'}
      </div>
      <div style={{ fontSize: '0.7rem', color: '#bae6fd' }}>
        To: {data.recipient_type || 'contact'}
      </div>
      <Handle type="source" position={Position.Right} style={{ background: 'rgb(14, 165, 233)' }} />
    </div>
  );
};

const TaskNodeComponent = ({ data }) => {
  return (
    <div style={{
      padding: '12px 16px',
      borderRadius: '8px',
      background: 'rgba(10, 35, 20, 0.85)',
      border: '2px solid rgb(34, 197, 94)',
      color: '#dcfce7',
      minWidth: '180px',
      boxShadow: '0 4px 12px rgba(34, 197, 94, 0.25)',
      backdropFilter: 'blur(8px)'
    }}>
      <Handle type="target" position={Position.Left} style={{ background: 'rgb(34, 197, 94)' }} />
      <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#86efac', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <CheckSquare size={12} /> Create Task
      </div>
      <div style={{ fontSize: '0.85rem', fontWeight: '600', marginTop: '4px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
        {data.title || 'Follow up'}
      </div>
      <div style={{ fontSize: '0.7rem', color: '#bbf7d0' }}>
        Due in: {data.days_due || 1} day(s)
      </div>
      <Handle type="source" position={Position.Right} style={{ background: 'rgb(34, 197, 94)' }} />
    </div>
  );
};

export default function WorkflowsView({ activeOrg }) {
  const [workflows, setWorkflows] = useState([]);
  const [runs, setRuns] = useState([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  
  // React Flow State
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedRun, setSelectedRun] = useState(null);
  
  // View states: 'list', 'edit', 'runs'
  const [currentTab, setCurrentTab] = useState('list');
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  
  // Create workflow modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [newWorkflowDesc, setNewWorkflowDesc] = useState('');

  // Selected Node Data reference for edit panel
  const selectedNode = useMemo(() => {
    return nodes.find(n => n.id === selectedNodeId);
  }, [nodes, selectedNodeId]);

  const nodeTypes = useMemo(() => ({
    crmTrigger: TriggerNodeComponent,
    conditionBlock: ConditionNodeComponent,
    sendEmail: EmailNodeComponent,
    createTask: TaskNodeComponent
  }), []);

  // Fetch all workflows in the current organization
  const fetchWorkflows = async () => {
    setLoading(true);
    try {
      const res = await api.getWorkflows();
      if (res.success) {
        setWorkflows(res.data);
      }
    } catch (err) {
      console.error("Failed to load workflows:", err);
      setActionError("Failed to load workflows.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch all execution runs logs
  const fetchRuns = async (workflowId = '') => {
    try {
      const res = await api.getWorkflowRuns(workflowId);
      if (res.success) {
        setRuns(res.data);
      }
    } catch (err) {
      console.error("Failed to load runs:", err);
    }
  };

  useEffect(() => {
    if (activeOrg) {
      fetchWorkflows();
      fetchRuns();
    }
  }, [activeOrg]);

  // Handle adding connection between nodes
  const onConnect = useCallback((params) => {
    setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: 'hsl(var(--color-primary-hover))' } }, eds));
  }, [setEdges]);

  // Open designer canvas for editing workflow
  const handleEditWorkflow = (workflow) => {
    setSelectedWorkflow(workflow);
    setNodes(workflow.nodes || []);
    setEdges(workflow.edges || []);
    setSelectedNodeId(null);
    setCurrentTab('edit');
    fetchRuns(workflow.id);
  };

  // Save changes to layout (nodes/edges/status/etc.)
  const handleSaveWorkflow = async () => {
    if (!selectedWorkflow) return;
    setLoading(true);
    setActionError('');
    setActionSuccess('');
    try {
      const payload = {
        name: selectedWorkflow.name,
        description: selectedWorkflow.description,
        is_active: selectedWorkflow.is_active,
        nodes,
        edges
      };
      const res = await api.updateWorkflow(selectedWorkflow.id, payload);
      if (res.success) {
        setActionSuccess("Workflow saved successfully.");
        // Refresh list
        fetchWorkflows();
      }
    } catch (err) {
      console.error(err);
      setActionError("Failed to save workflow configuration.");
    } finally {
      setLoading(false);
    }
  };

  // Create workflow handler
  const handleCreateWorkflow = async (e) => {
    e.preventDefault();
    if (!newWorkflowName.trim()) return;
    
    setLoading(true);
    try {
      // Default starting nodes layout: A simple Lead Trigger node
      const defaultNodes = [
        {
          id: 'node_trigger_init',
          type: 'crmTrigger',
          position: { x: 100, y: 150 },
          data: { event: 'lead_created', label: 'Trigger: Lead Created' }
        }
      ];

      const payload = {
        name: newWorkflowName,
        description: newWorkflowDesc,
        nodes: defaultNodes,
        edges: [],
        is_active: false
      };

      const res = await api.createWorkflow(payload);
      if (res.success) {
        setCreateModalOpen(false);
        setNewWorkflowName('');
        setNewWorkflowDesc('');
        // Open the newly created workflow directly
        handleEditWorkflow(res.data);
      }
    } catch (err) {
      console.error(err);
      setActionError("Failed to create workflow.");
    } finally {
      setLoading(false);
    }
  };

  // Delete workflow
  const handleDeleteWorkflow = async (id) => {
    if (!window.confirm("Are you sure you want to delete this workflow? This action cannot be undone.")) return;
    try {
      const res = await api.deleteWorkflow(id);
      if (res.success) {
        fetchWorkflows();
        if (selectedWorkflow && selectedWorkflow.id === id) {
          setCurrentTab('list');
          setSelectedWorkflow(null);
        }
      }
    } catch (err) {
      console.error(err);
      setActionError("Failed to delete workflow.");
    }
  };

  // Drag-and-drop / node adder helper
  const addNodeToCanvas = (type) => {
    const id = `node_${type}_${Date.now()}`;
    let defaultData = { label: type };

    if (type === 'crmTrigger') {
      defaultData = { event: 'lead_created', label: 'Trigger: Lead Created' };
    } else if (type === 'conditionBlock') {
      defaultData = { 
        field: 'score',
        operator: '>=',
        value: '80',
        label: 'Condition check' 
      };
    } else if (type === 'sendEmail') {
      defaultData = { 
        recipient_type: 'contact', 
        subject: 'Welcome to Oppora CRM', 
        body: 'Hi, thank you for reaching out to us!',
        label: 'Send welcome email'
      };
    } else if (type === 'createTask') {
      defaultData = { 
        title: 'Follow up task', 
        activity_type: 'TASK', 
        days_due: 1, 
        description: '',
        label: 'Schedule call' 
      };
    }

    const newNode = {
      id,
      type,
      position: { x: 250, y: 150 },
      data: defaultData
    };

    setNodes((nds) => nds.concat(newNode));
    setSelectedNodeId(id);
  };

  // Delete node from canvas
  const deleteNodeFromCanvas = (nodeId) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
    }
  };

  // Update properties on node from Property Sidebar
  const updateNodeData = (nodeId, key, value) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          const updatedData = {
            ...node.data,
            [key]: value
          };
          
          if (node.type === 'sendEmail' && key === 'subject') {
            updatedData.label = `Send Email: ${value}`;
          } else if (node.type === 'createTask' && key === 'title') {
            updatedData.label = `Create Task: ${value}`;
          }

          return {
            ...node,
            data: updatedData
          };
        }
        return node;
      })
    );
  };

  // Click handler on React Flow canvas nodes
  const onNodeClick = (event, node) => {
    setSelectedNodeId(node.id);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 'calc(100vh - 100px)' }}>
      {/* Tab Navigation header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid hsl(var(--border-color))', paddingBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {currentTab !== 'list' && (
            <button 
              className="btn btn-secondary" 
              onClick={() => {
                setCurrentTab('list');
                setSelectedWorkflow(null);
                fetchWorkflows();
              }}
              style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <ArrowLeft size={16} /> Back
            </button>
          )}
          <h2 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-display)', background: 'linear-gradient(135deg, #fff 40%, hsl(var(--color-primary)) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {currentTab === 'list' && 'CRM Automation Workflows'}
            {currentTab === 'edit' && `Edit Workflow: ${selectedWorkflow?.name}`}
            {currentTab === 'runs' && 'Execution Logs Audit'}
          </h2>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {currentTab === 'list' && (
            <>
              <button 
                className="btn btn-secondary" 
                onClick={() => setCurrentTab('runs')}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Activity size={16} /> View All Logs
              </button>
              <button 
                className="btn btn-primary" 
                onClick={() => setCreateModalOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={16} /> New Workflow
              </button>
            </>
          )}

          {currentTab === 'edit' && (
            <>
              <button 
                className={`btn ${selectedWorkflow?.is_active ? 'btn-danger' : 'btn-success'}`}
                onClick={() => {
                  setSelectedWorkflow({
                    ...selectedWorkflow,
                    is_active: !selectedWorkflow.is_active
                  });
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {selectedWorkflow?.is_active ? (
                  <>
                    <ToggleRight size={18} /> Deactivate
                  </>
                ) : (
                  <>
                    <ToggleLeft size={18} /> Activate
                  </>
                )}
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleSaveWorkflow}
                disabled={loading}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Save size={16} /> Save Workflow
              </button>
            </>
          )}
        </div>
      </div>

      {actionError && (
        <div style={{ background: 'hsl(var(--color-danger) / 0.1)', border: '1px solid hsl(var(--color-danger) / 0.2)', padding: '10px 12px', borderRadius: 'var(--radius-md)', color: 'hsl(var(--color-danger))', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
          {actionError}
        </div>
      )}
      {actionSuccess && (
        <div style={{ background: 'hsl(var(--color-success) / 0.1)', border: '1px solid hsl(var(--color-success) / 0.2)', padding: '10px 12px', borderRadius: 'var(--radius-md)', color: 'hsl(var(--color-success))', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
          {actionSuccess}
        </div>
      )}

      {/* --- VIEW 1: WORKFLOWS LIST VIEW --- */}
      {currentTab === 'list' && (
        <div className="grid-layout" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {workflows.length === 0 ? (
            <div className="glass-panel" style={{ gridColumn: '1 / -1', padding: '4rem 2rem', textAlign: 'center' }}>
              <Activity size={48} style={{ color: 'hsl(var(--color-primary))', opacity: 0.5, marginBottom: '1rem' }} />
              <h3>No Workflows Configured</h3>
              <p style={{ color: 'hsl(var(--text-secondary))', marginBottom: '1.5rem', maxWidth: '440px', margin: '6px auto' }}>
                Automate your sales workflows. Set up rules like automatically emailing leads, assigning follow-up tasks, and more.
              </p>
              <button className="btn btn-primary" onClick={() => setCreateModalOpen(true)}>
                Create First Workflow
              </button>
            </div>
          ) : (
            workflows.map((wf) => (
              <div key={wf.id} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <span className={`badge ${wf.is_active ? 'badge-success' : 'badge-secondary'}`}>
                      {wf.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
                      {new Date(wf.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.2rem', marginBottom: '6px', fontWeight: '700' }}>{wf.name}</h3>
                  <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.88rem', lineBreak: 'anywhere', minHeight: '40px', marginBottom: '1.5rem' }}>
                    {wf.description || 'No description provided.'}
                  </p>
                </div>
                
                <div style={{ display: 'flex', gap: '10px', marginTop: '1rem', borderTop: '1px solid hsl(var(--border-color))', paddingTop: '12px' }}>
                  <button className="btn btn-secondary" onClick={() => handleEditWorkflow(wf)} style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <Settings size={14} /> Open Builder
                  </button>
                  <button className="btn btn-danger" onClick={() => handleDeleteWorkflow(wf.id)} style={{ padding: '8px' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* --- VIEW 2: VISUAL FLOW CANVAS EDITOR --- */}
      {currentTab === 'edit' && (
        <div style={{ display: 'flex', flexGrow: 1, border: '1px solid hsl(var(--border-color))', borderRadius: 'var(--radius-lg)', overflow: 'hidden', background: '#09080e', position: 'relative', height: '600px' }}>
          
          {/* Node Palette panel (left) */}
          <div style={{ width: '220px', borderRight: '1px solid hsl(var(--border-color))', background: 'rgba(12, 11, 18, 0.95)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '12px', zIndex: 10 }}>
            <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(var(--text-secondary))', marginBottom: '6px' }}>Add Nodes</h4>
            
            <button className="btn btn-secondary" onClick={() => addNodeToCanvas('crmTrigger')} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', width: '100%', textAlign: 'left', borderLeft: '3px solid rgb(147, 51, 234)' }}>
              <Play size={14} style={{ color: 'rgb(147, 51, 234)' }} /> Trigger Node
            </button>
            <button className="btn btn-secondary" onClick={() => addNodeToCanvas('conditionBlock')} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', width: '100%', textAlign: 'left', borderLeft: '3px solid rgb(249, 115, 22)' }}>
              <Settings size={14} style={{ color: 'rgb(249, 115, 22)' }} /> Condition (If)
            </button>
            <button className="btn btn-secondary" onClick={() => addNodeToCanvas('sendEmail')} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', width: '100%', textAlign: 'left', borderLeft: '3px solid rgb(14, 165, 233)' }}>
              <Mail size={14} style={{ color: 'rgb(14, 165, 233)' }} /> Send Email Action
            </button>
            <button className="btn btn-secondary" onClick={() => addNodeToCanvas('createTask')} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', width: '100%', textAlign: 'left', borderLeft: '3px solid rgb(34, 197, 94)' }}>
              <CheckSquare size={14} style={{ color: 'rgb(34, 197, 94)' }} /> Create Task Action
            </button>
            
            <div style={{ marginTop: 'auto', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
              <strong>Tip:</strong> Drag edges from handles to connect triggers to conditions or actions. Delete selected nodes with the editor sidebar button.
            </div>
          </div>

          {/* Visual Canvas (middle) */}
          <div style={{ flexGrow: 1, position: 'relative', height: '100%' }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              nodeTypes={nodeTypes}
              fitView
            >
              <Controls />
              <Background color="#2a2830" gap={16} />
            </ReactFlow>
          </div>

          {/* Edit Properties panel (right) */}
          <div style={{ width: '280px', borderLeft: '1px solid hsl(var(--border-color))', background: 'rgba(12, 11, 18, 0.95)', padding: '1.25rem', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '15px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid hsl(var(--border-color))', paddingBottom: '8px' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: '700' }}>Properties Sheet</h4>
              {selectedNodeId && (
                <button 
                  onClick={() => deleteNodeFromCanvas(selectedNodeId)} 
                  style={{ background: 'none', border: 'none', color: 'hsl(var(--color-danger))', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}
                >
                  Delete Node
                </button>
              )}
            </div>

            {selectedNode ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))' }}>Node ID: <code>{selectedNode.id}</code></span>
                </div>

                {/* Properties: CRM TRIGGER node */}
                {selectedNode.type === 'crmTrigger' && (
                  <div className="form-group">
                    <label className="form-label">Trigger Event</label>
                    <select 
                      className="form-input"
                      value={selectedNode.data.event || 'lead_created'}
                      onChange={(e) => updateNodeData(selectedNode.id, 'event', e.target.value)}
                    >
                      <option value="lead_created">Lead Created</option>
                      <option value="deal_stage_updated">Deal Stage Updated</option>
                    </select>
                  </div>
                )}

                {/* Properties: CONDITION block node */}
                {selectedNode.type === 'conditionBlock' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div className="form-group">
                      <label className="form-label">Evaluate Conditions</label>
                      {/* We'll support configuring a single simple rule for simplicity in the UI */}
                      <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', display: 'block', marginBottom: '8px' }}>
                        Define rule to route traffic. True handle triggers if valid, otherwise False runs.
                      </span>
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Field name (e.g. <code>score</code>, <code>status</code>, or <code>category</code>)</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={selectedNode.data.field || ''} 
                        placeholder="score"
                        onChange={(e) => updateNodeData(selectedNode.id, 'field', e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Operator</label>
                      <select 
                        className="form-input"
                        value={selectedNode.data.operator || '=='}
                        onChange={(e) => updateNodeData(selectedNode.id, 'operator', e.target.value)}
                      >
                        <option value="==">Equals (==)</option>
                        <option value="!=">Not Equals (!=)</option>
                        <option value=">=">Greater/Equal (&gt;=)</option>
                        <option value="<=">Less/Equal (&lt;=)</option>
                        <option value="contains">Contains</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Match Value</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={selectedNode.data.value || ''} 
                        placeholder="80"
                        onChange={(e) => updateNodeData(selectedNode.id, 'value', e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Properties: SEND EMAIL node */}
                {selectedNode.type === 'sendEmail' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div className="form-group">
                      <label className="form-label">Send Alert Email</label>
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>To Recipient</label>
                      <select 
                        className="form-input"
                        value={selectedNode.data.recipient_type || 'contact'}
                        onChange={(e) => updateNodeData(selectedNode.id, 'recipient_type', e.target.value)}
                      >
                        <option value="contact">Contact (Prospect's email)</option>
                        <option value="owner">Workspace Owner (Your sales rep)</option>
                        <option value="custom">Custom Email Address</option>
                      </select>
                    </div>

                    {selectedNode.data.recipient_type === 'custom' && (
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Recipient Email</label>
                        <input 
                          type="email" 
                          className="form-input" 
                          placeholder="recipient@domain.com"
                          value={selectedNode.data.custom_email || ''} 
                          onChange={(e) => updateNodeData(selectedNode.id, 'custom_email', e.target.value)}
                        />
                      </div>
                    )}

                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Subject Line</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="Subject..."
                        value={selectedNode.data.subject || ''} 
                        onChange={(e) => updateNodeData(selectedNode.id, 'subject', e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Message Body</label>
                      <textarea 
                        className="form-input" 
                        rows={4}
                        placeholder="Email message content..."
                        value={selectedNode.data.body || ''} 
                        onChange={(e) => updateNodeData(selectedNode.id, 'body', e.target.value)}
                        style={{ resize: 'vertical' }}
                      />
                    </div>
                  </div>
                )}

                {/* Properties: CREATE TASK node */}
                {selectedNode.type === 'createTask' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div className="form-group">
                      <label className="form-label">Create Follow-up Activity</label>
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Task Title</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="Call new lead..."
                        value={selectedNode.data.title || ''} 
                        onChange={(e) => updateNodeData(selectedNode.id, 'title', e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Activity Type</label>
                      <select 
                        className="form-input"
                        value={selectedNode.data.activity_type || 'TASK'}
                        onChange={(e) => updateNodeData(selectedNode.id, 'activity_type', e.target.value)}
                      >
                        <option value="TASK">Task Checklist</option>
                        <option value="CALL">Phone Call</option>
                        <option value="MEETING">Calendar Meeting</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Days Due</label>
                      <input 
                        type="number" 
                        className="form-input" 
                        min={1}
                        value={selectedNode.data.days_due || 1} 
                        onChange={(e) => updateNodeData(selectedNode.id, 'days_due', parseInt(e.target.value) || 1)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Instructions / Notes</label>
                      <textarea 
                        className="form-input" 
                        rows={3}
                        placeholder="Description instructions..."
                        value={selectedNode.data.description || ''} 
                        onChange={(e) => updateNodeData(selectedNode.id, 'description', e.target.value)}
                        style={{ resize: 'vertical' }}
                      />
                    </div>
                  </div>
                )}

              </div>
            ) : (
              <div style={{ textAlign: 'center', color: 'hsl(var(--text-muted))', padding: '2rem 0' }}>
                <HelpCircle size={32} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
                <p style={{ fontSize: '0.8rem' }}>Click on a node on the canvas to configure its settings and parameters.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- VIEW 3: RUN AUDIT LOGS VIEW --- */}
      {currentTab === 'runs' && (
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} style={{ color: 'hsl(var(--color-primary))' }} />
            Recent Automations Executed
          </h3>
          
          {runs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'hsl(var(--text-muted))' }}>
              <Clock size={36} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
              <p>No runs registered yet. Active workflows trigger when leads are created or deals change stage.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Workflow</th>
                    <th>Status</th>
                    <th>Trigger Context</th>
                    <th>Executed Nodes</th>
                    <th>Error Detail</th>
                    <th>Run Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => (
                    <tr key={run.id}>
                      <td style={{ fontWeight: '600' }}>{run.workflow_name}</td>
                      <td>
                        <span className={`badge ${
                          run.status === 'COMPLETED' ? 'badge-success' :
                          run.status === 'FAILED' ? 'badge-danger' : 'badge-secondary'
                        }`}>
                          {run.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem' }}>
                        <code>{run.trigger_context?.model_name?.split('.')[1]}</code> | ID: {run.trigger_context?.object_id}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {run.execution_log && run.execution_log.map((log, i) => (
                            <span 
                              key={i} 
                              className="badge" 
                              style={{ 
                                background: log.status === 'SUCCESS' ? 'hsl(var(--color-success) / 0.15)' : 'hsl(var(--color-danger) / 0.15)',
                                color: log.status === 'SUCCESS' ? 'hsl(var(--color-success))' : 'hsl(var(--color-danger))',
                                border: '1px solid transparent',
                                fontSize: '0.7rem'
                              }}
                              title={JSON.stringify(log.output || log.error)}
                            >
                              {log.node_label || log.node_type}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ color: 'hsl(var(--color-danger))', fontSize: '0.8rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {run.error_message || '-'}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>
                        {new Date(run.started_at).toLocaleString()}
                      </td>
                      <td>
                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => setSelectedRun(run)}
                          style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}
                        >
                          <Eye size={12} /> Inspect
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* --- CREATE WORKFLOW MODAL --- */}
      {createModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '460px' }}>
            <div className="modal-header">
              <h3>Create Automation Workflow</h3>
              <button className="btn-close" onClick={() => setCreateModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleCreateWorkflow}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div className="form-group">
                  <label className="form-label">Workflow Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Send Welcome Email & Assign Task"
                    value={newWorkflowName}
                    onChange={(e) => setNewWorkflowName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Description (Optional)</label>
                  <textarea 
                    className="form-input" 
                    rows={3}
                    placeholder="Describe what rules trigger this workflow..."
                    value={newWorkflowDesc}
                    onChange={(e) => setNewWorkflowDesc(e.target.value)}
                    style={{ resize: 'vertical' }}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setCreateModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>Create Workflow</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* --- INSPECT RUN DETAILS MODAL --- */}
      {selectedRun && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>Workflow Execution Run</h3>
              <button className="btn-close" onClick={() => setSelectedRun(null)}>×</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxHeight: '70vh', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '6px', border: '1px solid hsl(var(--border-color))' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>Workflow Name</div>
                  <div style={{ fontWeight: '700' }}>{selectedRun.workflow_name}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>Run Status</div>
                  <span className={`badge ${selectedRun.status === 'COMPLETED' ? 'badge-success' : 'badge-danger'}`}>
                    {selectedRun.status}
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>Trigger Context</div>
                  <code>{selectedRun.trigger_context?.model_name?.split('.')[1]}</code> (ID: {selectedRun.trigger_context?.object_id})
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>Execution Timestamp</div>
                  <div style={{ fontSize: '0.85rem' }}>{new Date(selectedRun.started_at).toLocaleString()}</div>
                </div>
              </div>

              {selectedRun.error_message && (
                <div style={{ background: 'hsl(var(--color-danger) / 0.1)', border: '1px solid hsl(var(--color-danger) / 0.2)', padding: '12px', borderRadius: '6px', color: 'hsl(var(--color-danger))', fontSize: '0.85rem' }}>
                  <strong>Global Run Error:</strong> {selectedRun.error_message}
                </div>
              )}

              <h4 style={{ fontSize: '0.95rem', borderBottom: '1px solid hsl(var(--border-color))', paddingBottom: '6px', marginTop: '10px' }}>Executed Nodes Walkthrough</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {selectedRun.execution_log && selectedRun.execution_log.map((log, index) => (
                  <div key={index} style={{
                    background: 'rgba(255, 255, 255, 0.01)',
                    border: '1px solid hsl(var(--border-color))',
                    borderRadius: '6px',
                    padding: '12px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <strong style={{ fontSize: '0.9rem', color: 'hsl(var(--color-primary-hover))' }}>
                        {index + 1}. {log.node_label || log.node_type}
                      </strong>
                      <span className={`badge ${log.status === 'SUCCESS' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.75rem' }}>
                        {log.status}
                      </span>
                    </div>
                    {log.error && (
                      <div style={{ color: 'hsl(var(--color-danger))', fontSize: '0.8rem', marginBottom: '6px' }}>
                        <strong>Node Error:</strong> {log.error}
                      </div>
                    )}
                    <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', marginBottom: '4px' }}>Result Data:</div>
                    <div style={{ fontSize: '0.8rem', background: '#09080e', padding: '8px 12px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)', overflowX: 'auto' }}>
                      <pre style={{ margin: 0, fontFamily: 'monospace', color: '#c084fc' }}>
                        {JSON.stringify(log.output || log.error || {}, null, 2)}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedRun(null)}>Close Inspection</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
