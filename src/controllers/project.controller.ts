import { Request, Response } from 'express';
import { Project } from '../models/Project';
import User from '../models/user.model';
import { Department } from '../models/Department';
import { sendEmail } from '../utils/emailService';

// Helper function to send project notifications
const sendProjectNotification = async (
  type: 'create' | 'update' | 'add_member' | 'remove_member',
  project: any,
  recipient: any,
  additionalData?: any
) => {
  let subject = '';
  let html = '';

  switch (type) {
    case 'create':
      subject = `New Project Assignment: ${project.name}`;
      html = `
        <h2>New Project Assignment</h2>
        <p>You have been assigned to a new project:</p>
        <h3>${project.name}</h3>
        <p><strong>Description:</strong> ${project.description}</p>
        <p><strong>Start Date:</strong> ${new Date(project.startDate).toLocaleDateString()}</p>
        <p><strong>End Date:</strong> ${new Date(project.endDate).toLocaleDateString()}</p>
        <p><strong>Priority:</strong> ${project.priority}</p>
        <p><strong>Department:</strong> ${project.department.name}</p>
        <p>Please log in to view more details and start working on your tasks.</p>
      `;
      break;

    case 'update':
      subject = `Project Update: ${project.name}`;
      html = `
        <h2>Project Update</h2>
        <p>The following project has been updated:</p>
        <h3>${project.name}</h3>
        <p><strong>Description:</strong> ${project.description}</p>
        <p><strong>Status:</strong> ${project.status}</p>
        <p><strong>Start Date:</strong> ${new Date(project.startDate).toLocaleDateString()}</p>
        <p><strong>End Date:</strong> ${new Date(project.endDate).toLocaleDateString()}</p>
        <p><strong>Priority:</strong> ${project.priority}</p>
        <p>Please log in to view the complete update.</p>
      `;
      break;

    case 'add_member':
      subject = `Added to Project: ${project.name}`;
      html = `
        <h2>Project Team Assignment</h2>
        <p>You have been added to the project team:</p>
        <h3>${project.name}</h3>
        <p><strong>Project Manager:</strong> ${project.manager.firstName} ${project.manager.lastName}</p>
        <p><strong>Department:</strong> ${project.department.name}</p>
        <p>Please log in to view project details and start collaborating with your team.</p>
      `;
      break;

    case 'remove_member':
      subject = `Removed from Project: ${project.name}`;
      html = `
        <h2>Project Team Update</h2>
        <p>You have been removed from the project team:</p>
        <h3>${project.name}</h3>
        <p><strong>Project Manager:</strong> ${project.manager.firstName} ${project.manager.lastName}</p>
        <p><strong>Department:</strong> ${project.department.name}</p>
        <p>If you believe this is an error, please contact your project manager.</p>
      `;
      break;
  }

  await sendEmail(recipient.email, subject, html);
};

// Get all projects
export const getProjects = async (req: Request, res: Response) => {
  try {
    const { department, status } = req.query;
    let query: any = {};

    // Filter by department
    if (department) {
      query.department = department;
    }

    // Filter by status
    if (status) {
      query.status = status;
    }

    // If user is not admin, only show projects they're part of
    if (req.user.role !== 'admin') {
      query.$or = [
        { manager: req.user._id },
        { team: req.user._id }
      ];
    }

    const projects = await Project.find(query)
      .populate('manager', 'firstName lastName email')
      .populate('team', 'firstName lastName email')
      .populate('department', 'name')
      .populate('tasks', 'title status')
      .sort({ startDate: 1 });

    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching projects', error });
  }
};

// Get single project
export const getProject = async (req: Request, res: Response) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('manager', 'firstName lastName email')
      .populate('team', 'firstName lastName email')
      .populate('department', 'name')
      .populate({
        path: 'tasks',
        select: 'title description status priority dueDate assignedTo',
        populate: {
          path: 'assignedTo',
          select: 'firstName lastName email'
        }
      });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user has access to this project
    if (req.user.role !== 'admin' && 
        project.manager._id.toString() !== req.user._id.toString() && 
        !project.team.some(member => member._id.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Not authorized to view this project' });
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching project', error });
  }
};

// Create project
export const createProject = async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      startDate,
      endDate,
      manager,
      team,
      department,
      priority,
      budget
    } = req.body;

    // Check if department exists
    const dept = await Department.findById(department);
    if (!dept) {
      return res.status(400).json({ message: 'Department not found' });
    }

    // Check if manager exists
    const projectManager = await User.findById(manager);
    if (!projectManager) {
      return res.status(400).json({ message: 'Project manager not found' });
    }

    // Validate team members
    if (team && team.length > 0) {
      const teamMembers = await User.find({ _id: { $in: team } });
      if (teamMembers.length !== team.length) {
        return res.status(400).json({ message: 'One or more team members not found' });
      }
    }

    const project = await Project.create({
      name,
      description,
      startDate,
      endDate,
      manager,
      team: team || [],
      department,
      priority,
      budget,
      tasks: []
    });

    await project.populate('manager', 'firstName lastName email');
    await project.populate('team', 'firstName lastName email');
    await project.populate('department', 'name');

    // Send notifications
    try {
      // Notify project manager
      await sendProjectNotification('create', project, projectManager);

      // Notify team members
      if (project.team && project.team.length > 0) {
        for (const member of project.team) {
          await sendProjectNotification('create', project, member);
        }
      }

      // Notify admin
      const admin = await User.findOne({ role: 'admin' });
      if (admin) {
        await sendProjectNotification('create', project, admin);
      }
    } catch (emailError) {
      console.error('Error sending project notifications:', emailError);
    }

    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ message: 'Error creating project', error });
  }
};

// Update project
export const updateProject = async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      status,
      startDate,
      endDate,
      manager,
      team,
      department,
      priority,
      budget
    } = req.body;

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check authorization
    if (req.user.role !== 'admin' && project.manager.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this project' });
    }

    // Validate department if changed
    if (department && department !== project.department.toString()) {
      const dept = await Department.findById(department);
      if (!dept) {
        return res.status(400).json({ message: 'Department not found' });
      }
    }

    // Validate manager if changed
    if (manager && manager !== project.manager.toString()) {
      const projectManager = await User.findById(manager);
      if (!projectManager) {
        return res.status(400).json({ message: 'Project manager not found' });
      }
    }

    // Validate team members if changed
    if (team && team.length > 0) {
      const teamMembers = await User.find({ _id: { $in: team } });
      if (teamMembers.length !== team.length) {
        return res.status(400).json({ message: 'One or more team members not found' });
      }
    }

    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      {
        name,
        description,
        status,
        startDate,
        endDate,
        manager,
        team,
        department,
        priority,
        budget
      },
      { new: true, runValidators: true }
    )
      .populate('manager', 'firstName lastName email')
      .populate('team', 'firstName lastName email')
      .populate('department', 'name')
      .populate('tasks', 'title status');

    if (!updatedProject) {
      return res.status(404).json({ message: 'Project not found after update' });
    }

    // Send notifications
    try {
      // Notify project manager
      await sendProjectNotification('update', updatedProject, updatedProject.manager);

      // Notify team members
      if (updatedProject.team && updatedProject.team.length > 0) {
        for (const member of updatedProject.team) {
          await sendProjectNotification('update', updatedProject, member);
        }
      }

      // Notify admin
      const admin = await User.findOne({ role: 'admin' });
      if (admin) {
        await sendProjectNotification('update', updatedProject, admin);
      }
    } catch (emailError) {
      console.error('Error sending project update notifications:', emailError);
    }

    res.json(updatedProject);
  } catch (error) {
    res.status(500).json({ message: 'Error updating project', error });
  }
};

// Delete project
export const deleteProject = async (req: Request, res: Response) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check authorization
    if (req.user.role !== 'admin' && project.manager.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this project' });
    }

    await project.deleteOne();
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting project', error });
  }
};

// Add team member
export const addTeamMember = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check authorization
    if (req.user.role !== 'admin' && project.manager.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to modify team' });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    // Check if user is already in the team
    if (project.team.includes(userId)) {
      return res.status(400).json({ message: 'User is already in the team' });
    }

    project.team.push(userId);
    await project.save();

    await project.populate('manager', 'firstName lastName email');
    await project.populate('team', 'firstName lastName email');
    await project.populate('department', 'name');

    // Send notifications
    try {
      // Notify the new team member
      await sendProjectNotification('add_member', project, user);

      // Notify project manager
      await sendProjectNotification('add_member', project, project.manager);

      // Notify admin
      const admin = await User.findOne({ role: 'admin' });
      if (admin) {
        await sendProjectNotification('add_member', project, admin);
      }
    } catch (emailError) {
      console.error('Error sending team member addition notifications:', emailError);
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ message: 'Error adding team member', error });
  }
};

// Remove team member
export const removeTeamMember = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check authorization
    if (req.user.role !== 'admin' && project.manager.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to modify team' });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    // Check if user is in the team
    if (!project.team.includes(userId)) {
      return res.status(400).json({ message: 'User is not in the team' });
    }

    project.team = project.team.filter(id => id.toString() !== userId);
    await project.save();

    await project.populate('manager', 'firstName lastName email');
    await project.populate('team', 'firstName lastName email');
    await project.populate('department', 'name');

    // Send notifications
    try {
      // Notify the removed team member
      await sendProjectNotification('remove_member', project, user);

      // Notify project manager
      await sendProjectNotification('remove_member', project, project.manager);

      // Notify admin
      const admin = await User.findOne({ role: 'admin' });
      if (admin) {
        await sendProjectNotification('remove_member', project, admin);
      }
    } catch (emailError) {
      console.error('Error sending team member removal notifications:', emailError);
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ message: 'Error removing team member', error });
  }
}; 