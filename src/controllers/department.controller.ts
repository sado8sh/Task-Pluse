import { Request, Response } from 'express';
import { Department } from '../models/Department';
import User from '../models/user.model';
import { sendEmail } from '../utils/emailService';

// Helper function to send department notifications
const sendDepartmentNotification = async (
  type: 'create' | 'update' | 'add_employee' | 'remove_employee',
  department: any,
  recipient: any,
  additionalData?: any
) => {
  let subject = '';
  let html = '';

  switch (type) {
    case 'create':
      subject = `New Department Assignment: ${department.name}`;
      html = `
        <h2>New Department Assignment</h2>
        <p>You have been assigned to a new department:</p>
        <h3>${department.name}</h3>
        <p><strong>Type:</strong> ${department.type}</p>
        <p><strong>Description:</strong> ${department.description}</p>
        <p>Please log in to view more details and start collaborating with your team.</p>
      `;
      break;

    case 'update':
      subject = `Department Update: ${department.name}`;
      html = `
        <h2>Department Update</h2>
        <p>The following department has been updated:</p>
        <h3>${department.name}</h3>
        <p><strong>Type:</strong> ${department.type}</p>
        <p><strong>Description:</strong> ${department.description}</p>
        <p>Please log in to view the complete update.</p>
      `;
      break;

    case 'add_employee':
      subject = `Added to Department: ${department.name}`;
      html = `
        <h2>Department Assignment</h2>
        <p>You have been added to the department:</p>
        <h3>${department.name}</h3>
        <p><strong>Department Manager:</strong> ${department.manager.firstName} ${department.manager.lastName}</p>
        <p><strong>Type:</strong> ${department.type}</p>
        <p>Please log in to view department details and start collaborating with your team.</p>
      `;
      break;

    case 'remove_employee':
      subject = `Removed from Department: ${department.name}`;
      html = `
        <h2>Department Update</h2>
        <p>You have been removed from the department:</p>
        <h3>${department.name}</h3>
        <p><strong>Department Manager:</strong> ${department.manager.firstName} ${department.manager.lastName}</p>
        <p>If you believe this is an error, please contact your department manager.</p>
      `;
      break;
  }

  await sendEmail(recipient.email, subject, html);
};

// Get all departments
export const getDepartments = async (req: Request, res: Response) => {
  try {
    const departments = await Department.find()
      .populate('manager', 'firstName lastName email')
      .populate('employees', 'firstName lastName email position');
    
    res.json(departments);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching departments', error });
  }
};

// Get single department
export const getDepartment = async (req: Request, res: Response) => {
  try {
    const department = await Department.findById(req.params.id)
      .populate('manager', 'firstName lastName email')
      .populate('employees', 'firstName lastName email position');
    
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }
    
    res.json(department);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching department', error });
  }
};

// Create department
export const createDepartment = async (req: Request, res: Response) => {
  try {
    const { name, type, description, manager } = req.body;
    
    // Check if manager exists
    const departmentManager = await User.findById(manager);
    if (!departmentManager) {
      return res.status(400).json({ message: 'Department manager not found' });
    }
    
    const department = await Department.create({
      name,
      type,
      description,
      manager,
      employees: []
    });

    await department.populate('manager', 'firstName lastName email');
    
    // Send notifications
    try {
      // Notify department manager
      await sendDepartmentNotification('create', department, departmentManager);

      // Notify admin
      const admin = await User.findOne({ role: 'admin' });
      if (admin) {
        await sendDepartmentNotification('create', department, admin);
      }
    } catch (emailError) {
      console.error('Error sending department notifications:', emailError);
    }
    
    res.status(201).json(department);
  } catch (error) {
    res.status(500).json({ message: 'Error creating department', error });
  }
};

// Update department
export const updateDepartment = async (req: Request, res: Response) => {
  try {
    const { name, type, description, manager } = req.body;
    
    // Check if manager exists if changed
    if (manager) {
      const departmentManager = await User.findById(manager);
      if (!departmentManager) {
        return res.status(400).json({ message: 'Department manager not found' });
      }
    }
    
    const department = await Department.findByIdAndUpdate(
      req.params.id,
      { name, type, description, manager },
      { new: true, runValidators: true }
    )
    .populate('manager', 'firstName lastName email')
    .populate('employees', 'firstName lastName email position');
    
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    // Send notifications
    try {
      // Notify department manager
      await sendDepartmentNotification('update', department, department.manager);

      // Notify all employees
      if (department.employees && department.employees.length > 0) {
        for (const employee of department.employees) {
          await sendDepartmentNotification('update', department, employee);
        }
      }

      // Notify admin
      const admin = await User.findOne({ role: 'admin' });
      if (admin) {
        await sendDepartmentNotification('update', department, admin);
      }
    } catch (emailError) {
      console.error('Error sending department update notifications:', emailError);
    }
    
    res.json(department);
  } catch (error) {
    res.status(500).json({ message: 'Error updating department', error });
  }
};

// Delete department
export const deleteDepartment = async (req: Request, res: Response) => {
  try {
    const department = await Department.findById(req.params.id)
      .populate('manager', 'firstName lastName email')
      .populate('employees', 'firstName lastName email position');
    
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    // Send notifications before deleting
    try {
      // Notify department manager
      await sendDepartmentNotification('update', department, department.manager);

      // Notify all employees
      if (department.employees && department.employees.length > 0) {
        for (const employee of department.employees) {
          await sendDepartmentNotification('update', department, employee);
        }
      }

      // Notify admin
      const admin = await User.findOne({ role: 'admin' });
      if (admin) {
        await sendDepartmentNotification('update', department, admin);
      }
    } catch (emailError) {
      console.error('Error sending department deletion notifications:', emailError);
    }
    
    await department.deleteOne();
    res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting department', error });
  }
};

// Add employee to department
export const addEmployee = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.body;
    
    const department = await Department.findById(req.params.id);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }
    
    // Check if employee exists
    const employee = await User.findById(employeeId);
    if (!employee) {
      return res.status(400).json({ message: 'Employee not found' });
    }
    
    if (department.employees.includes(employeeId)) {
      return res.status(400).json({ message: 'Employee already in department' });
    }
    
    department.employees.push(employeeId);
    await department.save();

    await department.populate('manager', 'firstName lastName email');
    await department.populate('employees', 'firstName lastName email position');

    // Send notifications
    try {
      // Notify the new employee
      await sendDepartmentNotification('add_employee', department, employee);

      // Notify department manager
      await sendDepartmentNotification('add_employee', department, department.manager);

      // Notify admin
      const admin = await User.findOne({ role: 'admin' });
      if (admin) {
        await sendDepartmentNotification('add_employee', department, admin);
      }
    } catch (emailError) {
      console.error('Error sending employee addition notifications:', emailError);
    }
    
    res.json(department);
  } catch (error) {
    res.status(500).json({ message: 'Error adding employee to department', error });
  }
};

// Remove employee from department
export const removeEmployee = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.body;
    
    const department = await Department.findById(req.params.id);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    // Check if employee exists
    const employee = await User.findById(employeeId);
    if (!employee) {
      return res.status(400).json({ message: 'Employee not found' });
    }
    
    department.employees = department.employees.filter(
      (id) => id.toString() !== employeeId
    );
    
    await department.save();

    await department.populate('manager', 'firstName lastName email');
    await department.populate('employees', 'firstName lastName email position');

    // Send notifications
    try {
      // Notify the removed employee
      await sendDepartmentNotification('remove_employee', department, employee);

      // Notify department manager
      await sendDepartmentNotification('remove_employee', department, department.manager);

      // Notify admin
      const admin = await User.findOne({ role: 'admin' });
      if (admin) {
        await sendDepartmentNotification('remove_employee', department, admin);
      }
    } catch (emailError) {
      console.error('Error sending employee removal notifications:', emailError);
    }
    
    res.json(department);
  } catch (error) {
    res.status(500).json({ message: 'Error removing employee from department', error });
  }
}; 