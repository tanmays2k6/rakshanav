import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ShieldCheck, Mail, Lock, User, Briefcase, Building2, Phone, ArrowRight, CheckCircle } from 'lucide-react';
import { governmentService } from '../services/governmentService';
import Logo from '../components/Logo';

export default function GovernmentSignup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    department: '',
    designation: '',
    organizationId: '' // We would fetch organizations, but for demo we can leave it empty or hardcode
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [orgs, setOrgs] = useState([]);

  React.useEffect(() => {
    const fetchOrgs = async () => {
      const { data, error } = await supabase.from('government_organizations').select('id, name');
      if (data) setOrgs(data);
    };
    fetchOrgs();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Failed to create user");

      // 2. Insert into profiles with role 'government'
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: authData.user.id,
          email: formData.email,
          full_name: formData.fullName,
          phone: formData.phone,
          government_department: formData.department,
          role: 'government'
        });

      if (profileError) throw profileError;

      // 3. Register as government member (status: pending)
      await governmentService.registerGovernmentUser(
        authData.user.id,
        formData.organizationId || (orgs.length > 0 ? orgs[0].id : null),
        formData.department,
        formData.designation
      );

      setSubmitted(true);
      
    } catch (err) {
      setError(err.message || "An error occurred during signup");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#080c10] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center mb-6">
            <Logo size="lg" />
          </div>
          <div className="glass-panel p-8 rounded-2xl border border-white/10 text-center animate-fade-up">
            <div className="w-16 h-16 bg-brand-neonGreen/20 rounded-full flex items-center justify-center mx-auto mb-4 relative">
              <div className="absolute inset-0 rounded-full border-2 border-brand-neonGreen animate-ping opacity-20"></div>
              <CheckCircle className="w-8 h-8 text-brand-neonGreen" />
            </div>
            <h2 className="text-2xl font-display font-bold text-white mb-2">Registration Complete</h2>
            <p className="text-gray-400 mb-6">
              Your government account has been created and is currently <strong className="text-yellow-500">Pending Verification</strong>.
              You will receive an email once your account has been approved by an administrator.
            </p>
            <Link to="/login" className="w-full inline-flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-[#080c10] bg-white hover:bg-gray-100 transition-colors">
              Return to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080c10] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-blue/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-neonGreen/5 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 relative">
        <div className="flex justify-center mb-6">
          <Logo size="lg" />
        </div>
        <h2 className="text-center text-3xl font-display font-bold text-white tracking-tight">
          Government Portal
        </h2>
        <p className="mt-2 text-center text-sm text-gray-400">
          Official access for municipal authorities
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl z-10 relative">
        <div className="glass-panel py-8 px-4 sm:px-10 rounded-2xl border border-white/10 shadow-2xl">
          <form className="space-y-5" onSubmit={handleSignup}>
            
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Full Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-500" />
                  </div>
                  <input name="fullName" type="text" required value={formData.fullName} onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-2 border border-white/10 rounded-xl leading-5 bg-white/5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue sm:text-sm transition-all"
                    placeholder="John Doe"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Phone Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-500" />
                  </div>
                  <input name="phone" type="tel" required value={formData.phone} onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-2 border border-white/10 rounded-xl leading-5 bg-white/5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue sm:text-sm transition-all"
                    placeholder="+91 9876543210"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Official Government Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-500" />
                </div>
                <input name="email" type="email" required value={formData.email} onChange={handleChange}
                  className="block w-full pl-10 pr-3 py-2 border border-white/10 rounded-xl leading-5 bg-white/5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue sm:text-sm transition-all"
                  placeholder="name@karnataka.gov.in"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Government Org / Authority</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Building2 className="h-5 w-5 text-gray-500" />
                  </div>
                  <select name="organizationId" value={formData.organizationId} onChange={handleChange} required
                    className="block w-full pl-10 pr-3 py-2.5 border border-white/10 rounded-xl leading-5 bg-[#1a1f26] text-white focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue sm:text-sm transition-all">
                    <option value="" disabled>Select Organization</option>
                    {orgs.map(org => (
                      <option key={org.id} value={org.id}>{org.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Department</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Briefcase className="h-5 w-5 text-gray-500" />
                  </div>
                  <input name="department" type="text" required value={formData.department} onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-2 border border-white/10 rounded-xl leading-5 bg-white/5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue sm:text-sm transition-all"
                    placeholder="E.g. Traffic, Public Works"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Designation</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <ShieldCheck className="h-5 w-5 text-gray-500" />
                </div>
                <input name="designation" type="text" required value={formData.designation} onChange={handleChange}
                  className="block w-full pl-10 pr-3 py-2 border border-white/10 rounded-xl leading-5 bg-white/5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue sm:text-sm transition-all"
                  placeholder="Inspector, Engineer, etc."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-500" />
                </div>
                <input name="password" type="password" required value={formData.password} onChange={handleChange} minLength={6}
                  className="block w-full pl-10 pr-3 py-2 border border-white/10 rounded-xl leading-5 bg-white/5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue sm:text-sm transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-3 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-red-500" />
                <p className="text-sm text-red-500 font-medium">{error}</p>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-brand-blue hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>Register Official Account <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
            
            <div className="text-center mt-4">
              <p className="text-sm text-gray-400">
                Already have an official account? <Link to="/login" className="font-bold text-brand-blue hover:text-white transition-colors">Sign in</Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
