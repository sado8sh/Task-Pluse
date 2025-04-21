import { Request, Response } from 'express';
import { Department } from '../models/Department';

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
    
    const department = await Department.create({
      name,
      type,
      description,
      manager,
      employees: []
    });
    
    res.status(201).json(department);
  } catch (error) {
    res.status(500).json({ message: 'Error creating department', error });
  }
};

// Update department
export const updateDepartment = async (req: Request, res: Response) => {
  try {
    const { name, type, description, manager } = req.body;
    
    const department = await Department.findByIdAndUpdate(
      req.params.id,
      { name, type, description, manager },
      { new: true, runValidators: true }
    );
    
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }
    
    res.json(department);
  } catch (error) {
    res.status(500).json({ message: 'Error updating department', error });
  }
};

// Delete department
export const deleteDepartment = async (req: Request, res: Response) => {
  try {
    const department = await Department.findByIdAndDelete(req.params.id);
    
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }
    
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
    
    if (department.employees.includes(employeeId)) {
      return res.status(400).json({ message: 'Employee already in department' });
    }
    
    department.employees.push(employeeId);
    await department.save();
    
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
    
    department.employees = department.employees.filter(
      (id) => id.toString() !== employeeId
    );
    
    await department.save();
    
    res.json(department);
  } catch (error) {
    res.status(500).json({ message: 'Error removing employee from department', error });
  }
}; 