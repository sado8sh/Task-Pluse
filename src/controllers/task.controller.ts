import { Request, Response } from 'express';
import { Task } from '../models/Task';
import User from '../models/user.model';
import { sendMail } from '../utils/mailer';

// Get all tasks
export const getTasks = async (req: Request, res: Response) => {
  try {
    const { project, assignedTo, status } = req.query;
    let query: any = {};

    // Filter by project
    if (project) {
      query.project = project;
    }

    // Filter by assigned user
    if (assignedTo) {
      query.assignedTo = assignedTo;
    }

    // Filter by status
    if (status) {
      query.status = status;
    }

    // If user is not admin, only show tasks they're assigned to or created
    if (req.user.role !== 'admin') {
      query.$or = [
        { assignedTo: req.user._id },
        { createdBy: req.user._id }
      ];
    }

    const tasks = await Task.find(query)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .populate('project', 'name')
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tasks', error });
  }
};

// Get single task
export const getTask = async (req: Request, res: Response) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .populate('project', 'name')
      .populate('dependencies', 'title status');

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user has access to this task
    if (req.user.role !== 'admin' && 
        task.assignedTo._id.toString() !== req.user._id.toString() && 
        task.createdBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view this task' });
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching task', error });
  }
};

// Create task
export const createTask = async (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      priority,
      status,
      dueDate,
      assignedTo,
      project,
      dependencies,
      attachments
    } = req.body;

    // Check if assigned user exists
    const user = await User.findById(assignedTo);
    if (!user) {
      return res.status(400).json({ message: 'Assigned user not found' });
    }

    console.log('Assigned user found:', {
      id: user._id,
      email: user.email,
      name: user.name
    });

    const task = await Task.create({
      title,
      description,
      priority,
      status,
      dueDate,
      assignedTo,
      project,
      dependencies: dependencies || [],
      attachments: attachments || [],
      createdBy: req.user._id
    });

    await task.populate('assignedTo', 'name email');
    await task.populate('createdBy', 'name email');
    if (project) {
      await task.populate('project', 'name');
    }

    // Send email notifications
    const subject = 'New Task Assigned to You';
    const message = `A new task "${title}" has been assigned to you.`;
    
    // Type assertion for populated fields
    const assignedUser = task.assignedTo as any;
    const creator = task.createdBy as any;

    console.log('Populated assigned user:', {
      id: assignedUser._id,
      email: assignedUser.email,
      name: assignedUser.name
    });

    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">New Task Assignment</h2>
        <p>Hello ${assignedUser.name},</p>
        <p>A new task has been assigned to you:</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <h3 style="color: #2c3e50; margin-top: 0;">${title}</h3>
          <p><strong>Description:</strong> ${description}</p>
          <p><strong>Priority:</strong> ${priority}</p>
          <p><strong>Status:</strong> ${status}</p>
          <p><strong>Due Date:</strong> ${new Date(dueDate).toLocaleDateString()}</p>
          ${project ? `<p><strong>Project:</strong> ${(task.project as any).name}</p>` : ''}
        </div>
        <p>Please log in to your account to view more details and update the task status.</p>
        <p>Best regards,<br>Task Pulse Team</p>
      </div>
    `;

    // Notify assigned user (if not the creator)
    if (req.user._id.toString() !== assignedTo) {
      console.log('Sending email to assigned user:', assignedUser.email);
      await sendMail(assignedUser.email, subject, message, html);
    }

    // Notify creator
    if (creator) {
      console.log('Sending email to creator:', creator.email);
      const creatorSubject = 'Task Created Successfully';
      const creatorMessage = `You have created a new task "${title}".`;
      const creatorHtml = `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Task Created</h2>
          <p>Hello ${req.user.name},</p>
          <p>You have successfully created a new task:</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <h3 style="color: #2c3e50; margin-top: 0;">${title}</h3>
            <p><strong>Assigned To:</strong> ${assignedUser.name}</p>
            <p><strong>Priority:</strong> ${priority}</p>
            <p><strong>Status:</strong> ${status}</p>
            <p><strong>Due Date:</strong> ${new Date(dueDate).toLocaleDateString()}</p>
          </div>
          <p>You can track the progress of this task in your dashboard.</p>
          <p>Best regards,<br>Task Pulse Team</p>
        </div>
      `;
      await sendMail(creator.email, creatorSubject, creatorMessage, creatorHtml);
    }

    res.status(201).json(task);
  } catch (error) {
    console.error('Error in createTask:', error);
    res.status(500).json({ message: 'Error creating task', error });
  }
};

// Update task
export const updateTask = async (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      priority,
      status,
      dueDate,
      assignedTo,
      project,
      dependencies,
      attachments
    } = req.body;

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check authorization
    if (req.user.role !== 'admin' && 
        task.assignedTo.toString() !== req.user._id.toString() && 
        task.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this task' });
    }

    // If changing assigned user, check if new user exists
    if (assignedTo && assignedTo !== task.assignedTo.toString()) {
      const user = await User.findById(assignedTo);
      if (!user) {
        return res.status(400).json({ message: 'Assigned user not found' });
      }
    }

    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      {
        title,
        description,
        priority,
        status,
        dueDate,
        assignedTo,
        project,
        dependencies,
        attachments
      },
      { new: true, runValidators: true }
    )
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .populate('project', 'name')
      .populate('dependencies', 'title status');

    if (!updatedTask) {
      return res.status(404).json({ message: 'Task not found after update' });
    }

    // Send email notifications for task update
    const subject = 'Task Updated';
    const message = `Task "${updatedTask.title}" has been updated.`;
    const html = `<p>Task <strong>${updatedTask.title}</strong> has been updated.</p>`;

    // Notify admin
    const admins = await User.find({ role: 'admin' });
    admins.forEach(admin => sendMail(admin.email, subject, message, html));

    // Notify assigned user
    const assignedUser = updatedTask.assignedTo as any;
    if (assignedUser?.email) {
      sendMail(assignedUser.email, subject, message, html);
    }

    // Notify creator if different from assigned user
    const creator = updatedTask.createdBy as any;
    if (creator?.email && creator._id.toString() !== assignedUser?._id.toString()) {
      sendMail(creator.email, subject, message, html);
    }

    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({ message: 'Error updating task', error });
  }
};

// Delete task
export const deleteTask = async (req: Request, res: Response) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');
      
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check authorization
    if (req.user.role !== 'admin' && task.createdBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this task' });
    }

    // Send email notifications before deleting
    const subject = 'Task Deleted';
    const message = `Task "${task.title}" has been deleted.`;
    const html = `<p>Task <strong>${task.title}</strong> has been deleted.</p>`;

    // Notify admin
    const admins = await User.find({ role: 'admin' });
    admins.forEach(admin => sendMail(admin.email, subject, message, html));

    // Notify assigned user
    const assignedUser = task.assignedTo as any;
    if (assignedUser?.email) {
      sendMail(assignedUser.email, subject, message, html);
    }

    // Notify creator if different from assigned user
    const creator = task.createdBy as any;
    if (creator?.email && creator._id.toString() !== assignedUser?._id.toString()) {
      sendMail(creator.email, subject, message, html);
    }

    await task.deleteOne();
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting task', error });
  }
};

// Update task status
export const updateTaskStatus = async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check authorization
    if (req.user.role !== 'admin' && 
        task.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this task status' });
    }

    task.status = status;
    await task.save();

    await task.populate('assignedTo', 'name email');
    await task.populate('createdBy', 'name email');
    if (task.project) {
      await task.populate('project', 'name');
    }

    // Send email notifications for status update
    const subject = 'Task Status Updated';
    const message = `Task "${task.title}" status has been updated to ${status}.`;
    const html = `<p>Task <strong>${task.title}</strong> status has been updated to <strong>${status}</strong>.</p>`;

    // Notify admin
    const admins = await User.find({ role: 'admin' });
    admins.forEach(admin => sendMail(admin.email, subject, message, html));

    // Notify assigned user
    const assignedUser = task.assignedTo as any;
    if (assignedUser?.email) {
      sendMail(assignedUser.email, subject, message, html);
    }

    // Notify creator if different from assigned user
    const creator = task.createdBy as any;
    if (creator?.email && creator._id.toString() !== assignedUser?._id.toString()) {
      sendMail(creator.email, subject, message, html);
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: 'Error updating task status', error });
  }
}; 