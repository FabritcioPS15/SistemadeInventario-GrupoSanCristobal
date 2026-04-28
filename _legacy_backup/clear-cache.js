// Limpiar caché y recargar página
if ('caches' in window) {
  caches.keys().then(function(names) {
    names.forEach(function(name) {
      caches.delete(name);
    });
  });
}
localStorage.clear();
sessionStorage.clear();
location.reload(true);
