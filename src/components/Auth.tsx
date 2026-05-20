import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, Lock, User, Loader2 } from 'lucide-react';

export function Auth() {
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
              <button type="button" className="btn-link">Esqueci minha senha</button>
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
            {loading ? <Loader2 className="animate-spin" /> : (isSignUp ? 'Cadastrar' : 'Entrar')}
          </button>
        </form>

        <div className="auth-divider">
          <span>ou continue com</span>
        </div>

        <div className="social-auth">
          <button className="btn-social">Google</button>
          <button className="btn-social">Apple</button>
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
