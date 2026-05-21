import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, Lock, User, Loader2 } from 'lucide-react';

interface AuthProps {
  isResettingPassword?: boolean;
  onPasswordResetComplete?: () => void;
}

export function Auth({ isResettingPassword = false, onPasswordResetComplete }: AuthProps = {}) {
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const validatePassword = (pass: string) => {
    const hasNumber = /\d/.test(pass);
    const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(pass);
    const isLongEnough = pass.length >= 8;
    
    if (!isLongEnough) return "A senha deve ter pelo menos 8 caracteres.";
    if (!hasNumber) return "A senha deve conter pelo menos um número.";
    if (!hasSymbol) return "A senha deve conter pelo menos um caractere especial.";
    return null;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        if (password !== confirmPassword) {
          throw new Error('As senhas não coincidem.');
        }

        const passError = validatePassword(password);
        if (passError) throw new Error(passError);

        const { error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });
        
        if (authError) throw authError;
        
        alert('Cadastro realizado com sucesso! Faça login para continuar.');
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/`,
      });
      if (error) throw error;
      setResetEmailSent(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    const passError = validatePassword(newPassword);
    if (passError) {
      setError(passError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      alert('Senha atualizada com sucesso!');
      
      // Limpa os parâmetros de recovery/access_token da URL
      window.history.replaceState({}, document.title, window.location.origin + window.location.pathname);
      
      if (onPasswordResetComplete) {
        onPasswordResetComplete();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (isResettingPassword) {
    return (
      <div className="auth-overlay">
        <div className="auth-card">
          <div className="auth-header">
            <div className="logo-icon">JL</div>
            <h2>Nova Senha</h2>
            <p>Digite e confirme sua nova senha de acesso.</p>
          </div>

          <form onSubmit={handleResetPasswordSubmit} className="auth-form">
            <div className="form-group">
              <label><Lock size={16} /> Nova Senha</label>
              <input
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label><Lock size={16} /> Confirmar Nova Senha</label>
              <input
                type="password"
                placeholder="••••••••"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
              />
            </div>

            {error && <div className="auth-error">{error}</div>}

            <button type="submit" className="btn-primary auth-submit" disabled={loading}>
              {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Atualizar Senha'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (isForgotPassword) {
    return (
      <div className="auth-overlay">
        <div className="auth-card">
          <div className="auth-header">
            <div className="logo-icon">JL</div>
            <h2>Recuperar Senha</h2>
            <p>Digite seu e-mail cadastrado para receber o link de recuperação.</p>
          </div>

          {resetEmailSent ? (
            <div style={{ textAlign: 'center' }}>
              <div className="auth-error" style={{ backgroundColor: 'rgba(21, 128, 61, 0.05)', color: 'var(--success-green)', borderColor: 'rgba(21, 128, 61, 0.1)', marginBottom: '24px' }}>
                E-mail de recuperação enviado com sucesso! Verifique sua caixa de entrada.
              </div>
              <button 
                type="button" 
                className="btn-primary" 
                style={{ width: '100%' }}
                onClick={() => {
                  setIsForgotPassword(false);
                  setResetEmailSent(false);
                }}
              >
                Voltar para o Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="auth-form">
              <div className="form-group">
                <label><Mail size={16} /> E-mail</label>
                <input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {error && <div className="auth-error">{error}</div>}

              <button type="submit" className="btn-primary auth-submit" disabled={loading}>
                {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Enviar E-mail de Recuperação'}
              </button>

              <p className="auth-footer" style={{ marginTop: '16px' }}>
                Lembrou a senha? 
                <button type="button" onClick={() => setIsForgotPassword(false)}>
                  Fazer Login
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="auth-overlay">
      <div className="auth-card">
        <div className="auth-header">
          <div className="logo-icon">JL</div>
          <h2>{isSignUp ? 'Criar Conta' : 'Acesse sua Conta'}</h2>
          <p>{isSignUp ? 'Comece a gerenciar seus pacientes hoje.' : 'Bem-vindo de volta, Nutricionista.'}</p>
        </div>

        <form onSubmit={handleAuth} className="auth-form">
          {isSignUp && (
            <div className="form-group">
              <label><User size={16} /> Nome Completo</label>
              <input
                type="text"
                placeholder="Seu nome"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label><Mail size={16} /> E-mail</label>
            <input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label><Lock size={16} /> Senha</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {!isSignUp && (
            <div className="form-options">
              <label className="checkbox-container">
                <input type="checkbox" defaultChecked />
                <span className="checkmark"></span>
                Lembrar-me
              </label>
              <button type="button" className="btn-link" onClick={() => setIsForgotPassword(true)}>
                Esqueci minha senha
              </button>
            </div>
          )}

          {isSignUp && (
            <div className="form-group">
              <label><Lock size={16} /> Confirmar Senha</label>
              <input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          )}

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="btn-primary auth-submit" disabled={loading}>
            {loading ? <Loader2 className="animate-spin mx-auto" /> : (isSignUp ? 'Cadastrar' : 'Entrar')}
          </button>
        </form>

        <div className="auth-divider">
          <span>ou continue com</span>
        </div>

        <div className="social-auth">
          <button type="button" className="btn-social" onClick={() => handleSocialLogin('google')} disabled={loading}>
            Google
          </button>
          <button type="button" className="btn-social" onClick={() => handleSocialLogin('apple')} disabled={loading}>
            Apple
          </button>
        </div>

        <p className="auth-footer">
          {isSignUp ? 'Já tem uma conta?' : 'Não tem uma conta?'} 
          <button onClick={() => setIsSignUp(!isSignUp)}>
            {isSignUp ? 'Fazer Login' : 'Criar Conta'}
          </button>
        </p>
      </div>
    </div>
  );
}
