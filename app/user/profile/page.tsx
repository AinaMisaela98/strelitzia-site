import ProfilePage from "@/components/ProfilePage";

export default function Page() {
  const user = {
    id: 0,
    name: "Utilisateur",
    email: "user@strelitzia.school",
    role: "USER",
    profilePhoto: null,
  };

  return <ProfilePage user={user} />;
}
