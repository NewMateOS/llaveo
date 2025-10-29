import{g as y}from"./supabase-client.DOekNLRN.js";import{h as l}from"./session-sync.BLQ7z1dq.js";import"./index.9QnQ_JI4.js";import"./_commonjsHelpers.C4iS2aBk.js";const o=y();async function h(){await l(o);const{data:{session:e},error:t}=await o.auth.getSession();if(t||!e?.user){window.location.href="/?error="+encodeURIComponent("Necesitas iniciar sesión para ver tus favoritos");return}const s=document.getElementById("user-name"),a=document.getElementById("logout-btn"),i=e.user.user_metadata?.full_name||e.user.user_metadata?.name||e.user.email?.split("@")[0]||"Usuario";s&&(s.textContent=i,s.classList.remove("hidden")),a&&a.classList.remove("hidden"),await c(e.user.id)}async function c(e){const t=document.getElementById("loading-state"),s=document.getElementById("empty-state"),a=document.getElementById("favorites-container");try{const{data:i,error:n}=await o.from("favorites").select(`
            *,
            property:properties(
              id,
              title,
              description,
              price,
              city,
              address,
              rooms,
              baths,
              area_m2,
              status,
              property_images(url, sort_order)
            )
          `).eq("user_id",e).order("created_at",{ascending:!1});if(n)throw n;t&&t.classList.add("hidden"),!i||i.length===0?(s&&s.classList.remove("hidden"),a&&a.classList.add("hidden")):(s&&s.classList.add("hidden"),a&&(a.classList.remove("hidden"),a.innerHTML=i.map(m=>{const r=m.property;if(!r)return"";const u=r.property_images&&r.property_images.length>0?r.property_images.sort((p,f)=>(p.sort_order||0)-(f.sort_order||0))[0].url:"/placeholder-property.jpg";return`
                <article class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-200">
                  <div class="flex flex-col lg:flex-row">
                    <div class="relative overflow-hidden h-64 lg:h-80 lg:w-1/2">
                      <a href="/propiedad/${r.id}" class="block">
                        <img src="${u}" alt="${r.title}" class="w-full h-full object-cover hover:scale-105 transition-transform duration-300" loading="lazy" />
                      </a>
                      <div class="absolute top-4 right-4">
                        <span class="px-3 py-1 rounded-full text-xs font-medium text-white shadow-sm" style="background: var(--primary);">
                          ${r.status==="venta"?"Venta":"Alquiler"}
                        </span>
                      </div>
                    </div>
                    <div class="p-8 lg:w-1/2 flex flex-col justify-between">
                      <div>
                        <a href="/propiedad/${r.id}" class="block hover:opacity-80 transition-opacity duration-200">
                          <h2 class="text-2xl font-semibold mb-4" style="color: var(--text-primary);">${r.title}</h2>
                          <div class="flex items-center mb-4 text-gray-600">
                            <svg class="w-5 h-5 mr-2" style="color: var(--primary);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            </svg>
                            <span class="text-base">${r.address} · ${r.city}</span>
                          </div>
                          <p class="text-gray-600 mb-6 leading-relaxed">${r.description||"Descripción no disponible"}</p>
                        </a>
                      </div>
                      <div class="flex items-center justify-between pt-6 border-t border-gray-100">
                        <div class="text-2xl font-bold" style="color: var(--primary);">
                          ${new Intl.NumberFormat("es-ES",{style:"currency",currency:"EUR"}).format(Number(r.price||0))}
                        </div>
                        <a href="/propiedad/${r.id}" class="px-4 py-2 rounded-lg text-sm font-medium text-white shadow-sm hover:shadow-md transition-all duration-200" style="background: var(--primary);">
                          Ver Detalles
                        </a>
                      </div>
                    </div>
                  </div>
                </article>
              `}).join("")))}catch(i){console.error("Error loading favorites:",i),t&&t.classList.add("hidden"),s&&s.classList.remove("hidden"),alert("Error al cargar tus favoritos")}}window.handleLogout=async function(){const{error:e}=await o.auth.signOut();try{await fetch("/api/auth/session",{method:"DELETE",credentials:"same-origin"})}catch(t){console.error("Error al limpiar la sesión del servidor:",t)}e?(console.error("Error al cerrar sesión:",e),alert("Error al cerrar sesión")):window.location.href="/"};h();function v(){const e=document.getElementById("inquiryModal"),t=document.getElementById("inquiryForm");e&&(e.classList.add("hidden"),e.classList.remove("flex")),t&&t.reset()}const d=document.getElementById("inquiryModal");d&&d.addEventListener("click",e=>{e.target.id==="inquiryModal"&&v()});window.onFavoriteToggle=async(e,t)=>{if(!t){await l(o);const{data:{session:s}}=await o.auth.getSession();s?.user&&await c(s.user.id)}};
